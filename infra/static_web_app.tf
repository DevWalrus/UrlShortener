resource "azurerm_static_web_app" "creator_ui" {
  name                = "${var.project}-creator-ui"
  resource_group_name = azurerm_resource_group.main.name
  location            = "eastus2"
  sku_tier            = "Free"
  sku_size            = "Free"
}