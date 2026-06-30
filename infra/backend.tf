terraform {
  backend "azurerm" {
    resource_group_name  = "rg-clinten-tfstate"
    storage_account_name = "clintentfstate"
    container_name       = "tfstate"
    key                  = "clinten.tfstate"
  }
}