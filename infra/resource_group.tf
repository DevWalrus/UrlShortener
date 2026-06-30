resource "azurerm_resource_group" "main" {
  name     = "rg-${var.project}"
  location = var.location
}