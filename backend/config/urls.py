from django.contrib import admin
from django.urls import include, path
from core import views as core_views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", core_views.landing, name="landing"),
    path("api/", include("core.urls")),
]
