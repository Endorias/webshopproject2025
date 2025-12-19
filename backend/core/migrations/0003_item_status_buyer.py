from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_cartitem"),
    ]

    operations = [
        migrations.AddField(
            model_name="item",
            name="buyer",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="purchased_items",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="item",
            name="status",
            field=models.CharField(
                choices=[("available", "Available"), ("sold", "Sold")],
                default="available",
                max_length=20,
            ),
        ),
    ]
