from django.urls import path
from . import views

urlpatterns = [
    path("", views.api_placeholder, name="api-placeholder"),
    path("seed-demo/", views.populate_demo_data, name="populate-demo-data"),
    path("items/", views.list_items, name="list-items"),
    path("items/<int:item_id>/", views.item_detail, name="item-detail"),
    path("cart/", views.cart_view, name="cart"),
    path("cart/<int:cart_item_id>/", views.cart_item_detail, name="cart-item-detail"),
    path("signup/", views.signup, name="signup"),
    path("login/", views.login_view, name="login"),
    path("me/", views.me, name="me"),
    path("logout/", views.logout_view, name="logout"),
]
