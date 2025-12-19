import json
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import Item, CartItem, STATUS_AVAILABLE, STATUS_SOLD


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
    # Include PATCH/PUT so item edits can be performed from the frontend.
    response["Access-Control-Allow-Methods"] = "GET, POST, PATCH, PUT, DELETE, OPTIONS"
    return response


def _serialize_item(item: Item) -> dict:
    return {
        "id": item.id,
        "title": item.name,
        "description": item.description,
        "price": str(item.price),
        "date_added": item.created_at.isoformat(),
        "owner": item.owner.username,
        "status": item.status,
        "buyer": item.buyer.username if item.buyer else None,
    }


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
        items = Item.objects.select_related("owner", "buyer").all()

        search_term = (request.GET.get("q") or "").strip()
        if search_term:
            items = items.filter(name__icontains=search_term)

        if request.GET.get("mine"):
            if not request.user.is_authenticated:
                return _with_cors(request, JsonResponse({"message": "Authentication required"}, status=401))
            # When mine=1, show all statuses for the owner.
            items = items.filter(owner=request.user)
        else:
            # Public listing only shows items still available.
            items = items.filter(status=STATUS_AVAILABLE)

        payload = [_serialize_item(item) for item in items]
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

    if request.method in {"PATCH", "PUT"}:
        if not request.user.is_authenticated:
            return _with_cors(request, JsonResponse({"message": "Authentication required"}, status=401))
        if item.owner_id != request.user.id:
            return _with_cors(request, JsonResponse({"message": "Forbidden"}, status=403))
        if item.status != STATUS_AVAILABLE:
            return _with_cors(request, JsonResponse({"message": "Item is not available for editing"}, status=400))

        try:
            data = json.loads(request.body.decode("utf-8"))
        except Exception:
            return _with_cors(request, JsonResponse({"message": "Invalid JSON body"}, status=400))

        if "price" not in data:
            return _with_cors(request, JsonResponse({"message": "price is required"}, status=400))

        try:
            new_price = Decimal(str(data.get("price")))
        except Exception:
            return _with_cors(request, JsonResponse({"message": "price must be a number"}, status=400))

        item.price = new_price
        item.save(update_fields=["price"])

        return _with_cors(
            request,
            JsonResponse(
                {
                    "message": "Item updated",
                    "item": _serialize_item(item),
                },
                status=200,
            ),
        )

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

        if item.status != STATUS_AVAILABLE:
            return _with_cors(request, JsonResponse({"message": "Item is no longer available"}, status=400))

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
def cart_pay(request):
    if request.method == "OPTIONS":
        return _with_cors(request, HttpResponse(status=204))

    if not request.user.is_authenticated:
        return _with_cors(request, JsonResponse({"message": "Authentication required"}, status=401))

    if request.method != "POST":
        return _with_cors(request, JsonResponse({"message": "Method not allowed"}, status=405))

    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        return _with_cors(request, JsonResponse({"message": "Invalid JSON body"}, status=400))

    expected_prices: dict[int, Decimal] = {}
    for entry in data.get("items", []):
        try:
            cart_entry_id = int(entry.get("cart_item_id"))
        except Exception:
            continue

        if "price" in entry:
            try:
                expected_prices[cart_entry_id] = Decimal(str(entry.get("price")))
            except Exception:
                # Ignore invalid price payloads; validation will happen against current prices.
                continue

    with transaction.atomic():
        cart_entries = (
            CartItem.objects.select_related("item", "item__owner")
            .filter(user=request.user)
            .select_for_update()
        )

        if not cart_entries.exists():
            return _with_cors(request, JsonResponse({"message": "Your cart is empty."}, status=400))

        price_changes: list[dict] = []
        unavailable_items: list[dict] = []

        for entry in cart_entries:
            item = entry.item

            if item.status != STATUS_AVAILABLE:
                unavailable_items.append(
                    {
                        "cart_item_id": entry.id,
                        "item_id": item.id,
                        "title": item.name,
                        "status": item.status,
                    }
                )
                continue

            expected_price = expected_prices.get(entry.id)
            if expected_price is not None and item.price != expected_price:
                price_changes.append(
                    {
                        "cart_item_id": entry.id,
                        "item_id": item.id,
                        "title": item.name,
                        "expected_price": str(expected_price),
                        "current_price": str(item.price),
                    }
                )

        if price_changes or unavailable_items:
            return _with_cors(
                request,
                JsonResponse(
                    {
                        "message": "Cart needs review before paying.",
                        "price_changes": price_changes,
                        "unavailable_items": unavailable_items,
                    },
                    status=409,
                ),
            )

        purchased_items: list[dict] = []
        cart_entry_ids: list[int] = []

        for entry in cart_entries:
            item = entry.item

            if item.status != STATUS_AVAILABLE:
                unavailable_items.append(
                    {
                        "cart_item_id": entry.id,
                        "item_id": item.id,
                        "title": item.name,
                        "status": item.status,
                    }
                )
                continue

            item.status = STATUS_SOLD
            item.buyer = request.user
            item.save(update_fields=["status", "buyer"])

            purchased_items.append(_serialize_item(item))
            cart_entry_ids.append(entry.id)

        if unavailable_items:
            return _with_cors(
                request,
                JsonResponse(
                    {
                        "message": "Some items became unavailable during checkout.",
                        "unavailable_items": unavailable_items,
                    },
                    status=409,
                ),
            )

        if cart_entry_ids:
            CartItem.objects.filter(id__in=cart_entry_ids).delete()

    payload = {
        "message": "Payment completed successfully.",
        "purchased": purchased_items,
        "cleared_cart_item_ids": cart_entry_ids,
    }
    return _with_cors(request, JsonResponse(payload, status=200))


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


@csrf_exempt
def change_password(request):
    if request.method == "OPTIONS":
        return _with_cors(request, HttpResponse(status=204))

    if request.method != "POST":
        return _with_cors(request, JsonResponse({"message": "Method not allowed"}, status=405))

    if not request.user.is_authenticated:
        return _with_cors(request, JsonResponse({"message": "Authentication required"}, status=401))

    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return _with_cors(request, JsonResponse({"message": "Invalid JSON body"}, status=400))

    old_password = data.get("old_password") or ""
    new_password = data.get("new_password") or ""

    if not old_password or not new_password:
        return _with_cors(request, JsonResponse({"message": "old_password and new_password are required"}, status=400))

    if not request.user.check_password(old_password):
        return _with_cors(request, JsonResponse({"message": "Old password is incorrect"}, status=400))

    request.user.set_password(new_password)
    request.user.save()
    # Keep the user logged in after password change.
    login(request, request.user)

    return _with_cors(request, JsonResponse({"message": "Password updated successfully"}, status=200))


@csrf_exempt
def inventory_view(request):
    if request.method == "OPTIONS":
        return _with_cors(request, HttpResponse(status=204))

    if request.method != "GET":
        return _with_cors(request, JsonResponse({"message": "Method not allowed"}, status=405))

    if not request.user.is_authenticated:
        return _with_cors(request, JsonResponse({"message": "Authentication required"}, status=401))

    base_query = Item.objects.select_related("owner", "buyer")
    on_sale = base_query.filter(owner=request.user, status=STATUS_AVAILABLE)
    sold = base_query.filter(owner=request.user, status=STATUS_SOLD)
    purchased = base_query.filter(buyer=request.user)

    payload = {
        "on_sale": [_serialize_item(item) for item in on_sale],
        "sold": [_serialize_item(item) for item in sold],
        "purchased": [_serialize_item(item) for item in purchased],
    }

    return _with_cors(request, JsonResponse(payload, status=200))
