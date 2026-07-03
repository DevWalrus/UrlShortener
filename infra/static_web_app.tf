resource "azurerm_static_web_app" "creator_ui_stage" {
  name                = "${var.project}-creator-ui-stage"
  resource_group_name = azurerm_resource_group.main.name
  location            = "eastus2"
  sku_tier            = "Free"
  sku_size            = "Free"

  app_settings = {
    CREATOR_API_URL = "https://${azurerm_container_app.creator_api_stage.ingress[0].fqdn}"
    MONGODB_URI     = azurerm_cosmosdb_account.main.primary_mongodb_connection_string
  }
}

resource "azurerm_static_web_app" "creator_ui" {
  name                = "${var.project}-creator-ui"
  resource_group_name = azurerm_resource_group.main.name
  location            = "eastus2"
  sku_tier            = "Free"
  sku_size            = "Free"

  app_settings = {
    CREATOR_API_URL = "https://${azurerm_container_app.creator_api.ingress[0].fqdn}"
    MONGODB_URI     = azurerm_cosmosdb_account.main.primary_mongodb_connection_string
  }
}