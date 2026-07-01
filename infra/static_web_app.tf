resource "azurerm_static_web_app" "creator_ui" {
  name                = "${var.project}-creator-ui"
  resource_group_name = azurerm_resource_group.main.name
  location            = "eastus2"
  sku_tier            = "Free"
  sku_size            = "Free"

  app_settings = {
    AAD_CLIENT_ID     = azuread_application.creator_ui.client_id
    AAD_CLIENT_SECRET = azuread_application_password.creator_ui.value
  }
}