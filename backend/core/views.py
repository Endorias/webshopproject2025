import json
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import Item, CartItem


def landing(request):
    return HttpResponse("Webshop backend is running.")


def api_placeholder(request):
    payload = {"status": "ok", "message": "API placeholder"}
    return JsonResponse(payload)


def _with_cors(request, response: HttpResponse) -> HttpResponse:
    origin = request.headers.get("Origin")
    if origin:
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Credentials"] = "true"
    else:
        response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Headers"] = "Content-Type"
    response["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
    return response


@csrf_exempt
def populate_demo_data(request):
    if request.method == "OPTIONS":
        return _with_cors(request, HttpResponse(status=204))

    if request.method != "POST":
        return _with_cors(request, JsonResponse({"message": "Method not allowed"}, status=405))

    User = get_user_model()

    with transaction.atomic():
        Item.objects.all().delete()
        User.objects.exclude(is_superuser=True).delete()

        users = []
        for idx in range(1, 7):
            username = f"testuser{idx}"
            user = User.objects.create_user(
                username=username,
                email=f"{username}@shop.aa",
                password=f"pass{idx}",
            )
            users.append(user)

        seller_candidates = users[:3]
        items_to_create: list[Item] = []

        for seller_index, seller in enumerate(seller_candidates, start=1):
            for item_index in range(1, 11):
                items_to_create.append(
                    Item(
                        owner=seller,
                        name=f"Seller {seller_index} Item {item_index}",
                        description=f"Item {item_index} sold by Seller {seller_index} in webshop.",
                        price=Decimal(f"{seller_index * 10 + item_index:.2f}"),
                    )
                )

        Item.objects.bulk_create(items_to_create)

    payload = {
        "message": "Database populated with 6 users (3 sellers) and 30 items.",
        "users_created": 6,
        "sellers_with_items": 3,
        "items_created": 30,
    }
    return _with_cors(request, JsonResponse(payload, status=201))


@csrf_exempt
def list_items(request):
    if request.method == "OPTIONS":
        return _with_cors(request, HttpResponse(status=204))

    if request.method == "GET":
        items = Item.objects.select_related("owner").all()
        if request.GET.get("mine"):
            if not request.user.is_authenticated:
                return _with_cors(request, JsonResponse({"message": "Authentication required"}, status=401))
            items = items.filter(owner=request.user)
        payload = [
            {
                "id": item.id,
                "title": item.name,
                "description": item.description,
                "price": str(item.price),
                "date_added": item.created_at.isoformat(),
                "owner": item.owner.username,
            }
            for item in items
        ]
        return _with_cors(request, JsonResponse(payload, safe=False))

    if request.method == "POST":
        if not request.user.is_authenticated:
            return _with_cors(request, JsonResponse({"message": "Authentication required"}, status=401))

        try:
            data = json.loads(request.body.decode("utf-8"))
        except Exception:
            return _with_cors(request, JsonResponse({"message": "Invalid JSON body"}, status=400))

        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        price_raw = data.get("price")

        if not title or price_raw is None:
            return _with_cors(
                request, JsonResponse({"message": "title and price are required"}, status=400)
            )

        try:
            price = Decimal(str(price_raw))
        except Exception:
            return _with_cors(request, JsonResponse({"message": "price must be a number"}, status=400))

        item = Item.objects.create(
            owner=request.user,
            name=title,
            description=description,
            price=price,
        )

        payload = {
            "message": "Item created",
            "item": {
                "id": item.id,
                "title": item.name,
                "description": item.description,
                "price": str(item.price),
                "date_added": item.created_at.isoformat(),
                "owner": item.owner.username,
            },
        }
        return _with_cors(request, JsonResponse(payload, status=201))

    return _with_cors(request, JsonResponse({"message": "Method not allowed"}, status=405))


@csrf_exempt
def item_detail(request, item_id: int):
    if request.method == "OPTIONS":
        return _with_cors(request, HttpResponse(status=204))

    try:
        item = Item.objects.get(pk=item_id)
    except Item.DoesNotExist:
        return _with_cors(request, JsonResponse({"message": "Not found"}, status=404))

    if request.method == "DELETE":
        if not request.user.is_authenticated:
            return _with_cors(request, JsonResponse({"message": "Authentication required"}, status=401))
        if item.owner_id != request.user.id:
            return _with_cors(request, JsonResponse({"message": "Forbidden"}, status=403))
        item.delete()
        return _with_cors(request, JsonResponse({"message": "Item deleted"}, status=200))

    return _with_cors(request, JsonResponse({"message": "Method not allowed"}, status=405))


@csrf_exempt
def cart_view(request):
    if request.method == "OPTIONS":
        return _with_cors(request, HttpResponse(status=204))

    if not request.user.is_authenticated:
        return _with_cors(request, JsonResponse({"message": "Authentication required"}, status=401))

    if request.method == "GET":
        entries = (
            CartItem.objects.select_related("item", "item__owner")
            .filter(user=request.user)
            .order_by("-created_at")
        )
        payload = [
            {
                "id": entry.id,
                "item_id": entry.item.id,
                "title": entry.item.name,
                "description": entry.item.description,
                "price": str(entry.item.price),
                "date_added": entry.item.created_at.isoformat(),
                "seller": entry.item.owner.username,
                "added_at": entry.created_at.isoformat(),
            }
            for entry in entries
        ]
        return _with_cors(request, JsonResponse(payload, safe=False))

    if request.method == "POST":
        try:
            data = json.loads(request.body.decode("utf-8"))
        except Exception:
            return _with_cors(request, JsonResponse({"message": "Invalid JSON body"}, status=400))

        item_id = data.get("item_id")
        if not item_id:
            return _with_cors(request, JsonResponse({"message": "item_id is required"}, status=400))

        try:
            item = Item.objects.select_related("owner").get(pk=item_id)
        except Item.DoesNotExist:
            return _with_cors(request, JsonResponse({"message": "Item not found"}, status=404))

        if item.owner_id == request.user.id:
            return _with_cors(request, JsonResponse({"message": "Cannot add your own item"}, status=400))

        cart_entry, created = CartItem.objects.get_or_create(user=request.user, item=item)
        payload = {
            "message": "Added to cart" if created else "Already in cart",
            "cart_item": {
                "id": cart_entry.id,
                "item_id": item.id,
                "title": item.name,
                "price": str(item.price),
                "seller": item.owner.username,
            },
        }
        return _with_cors(request, JsonResponse(payload, status=201 if created else 200))

    return _with_cors(request, JsonResponse({"message": "Method not allowed"}, status=405))


@csrf_exempt
def cart_item_detail(request, cart_item_id: int):
    if request.method == "OPTIONS":
        return _with_cors(request, HttpResponse(status=204))

    if not request.user.is_authenticated:
        return _with_cors(request, JsonResponse({"message": "Authentication required"}, status=401))

    try:
        entry = CartItem.objects.select_related("item").get(pk=cart_item_id, user=request.user)
    except CartItem.DoesNotExist:
        return _with_cors(request, JsonResponse({"message": "Not found"}, status=404))

    if request.method == "DELETE":
        entry.delete()
        return _with_cors(request, JsonResponse({"message": "Removed from cart"}, status=200))

    return _with_cors(request, JsonResponse({"message": "Method not allowed"}, status=405))


@csrf_exempt
def signup(request):
    if request.method == "OPTIONS":
        return _with_cors(request, HttpResponse(status=204))

    if request.method != "POST":
        return _with_cors(request, JsonResponse({"message": "Method not allowed"}, status=405))

    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return _with_cors(request, JsonResponse({"message": "Invalid JSON body"}, status=400))

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    if not username or not email or not password:
        return _with_cors(
            request, JsonResponse({"message": "username, email, and password are required"}, status=400)
        )

    User = get_user_model()
    if User.objects.filter(username=username).exists():
        return _with_cors(request, JsonResponse({"message": "Username already taken"}, status=400))

    user = User.objects.create_user(username=username, email=email, password=password)

    payload = {
        "message": "Account created successfully",
        "user": {"id": user.id, "username": user.username, "email": user.email},
    }
    return _with_cors(request, JsonResponse(payload, status=201))


@csrf_exempt
def login_view(request):
    if request.method == "OPTIONS":
        return _with_cors(request, HttpResponse(status=204))

    if request.method != "POST":
        return _with_cors(request, JsonResponse({"message": "Method not allowed"}, status=405))

    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return _with_cors(request, JsonResponse({"message": "Invalid JSON body"}, status=400))

    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return _with_cors(request, JsonResponse({"message": "username and password are required"}, status=400))

    user = authenticate(request, username=username, password=password)
    if user is None:
        return _with_cors(request, JsonResponse({"message": "Invalid credentials"}, status=401))

    login(request, user)

    payload = {
        "message": "Logged in successfully",
        "user": {"id": user.id, "username": user.username, "email": user.email},
    }
    return _with_cors(request, JsonResponse(payload, status=200))


def me(request):
    if request.method == "OPTIONS":
        return _with_cors(request, HttpResponse(status=204))

    if request.method != "GET":
        return _with_cors(request, JsonResponse({"message": "Method not allowed"}, status=405))

    if not request.user.is_authenticated:
        return _with_cors(request, JsonResponse({"authenticated": False}, status=200))

    payload = {
        "authenticated": True,
        "user": {
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
        },
    }
    return _with_cors(request, JsonResponse(payload, status=200))


@csrf_exempt
def logout_view(request):
    if request.method == "OPTIONS":
        return _with_cors(request, HttpResponse(status=204))

    if request.method != "POST":
        return _with_cors(request, JsonResponse({"message": "Method not allowed"}, status=405))

    logout(request)
    return _with_cors(request, JsonResponse({"message": "Logged out"}, status=200))
