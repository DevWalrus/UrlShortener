resource "azurerm_cosmosdb_account" "main" {
  name                = "${var.project}-cosmos"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  offer_type          = "Standard"
  kind                = "MongoDB"
  free_tier_enabled   = true

  mongo_server_version = "4.2"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.main.location
    failover_priority = 0
  }

  capabilities {
    name = "EnableMongo"
  }
}

# Throughput is shared at the database level (400 RU/s each, 800 total) so the account stays inside the
# free tier's 1000 RU/s. Collections must NOT set their own throughput: 4 dedicated collections at the
# 400 RU/s minimum is 1600 RU/s, which used up the free tier by about the 20th of each month (~$12/mo).
# Shared throughput can only be set when a database is created, so changing this means recreating
# the database and its collections (back the data up first).
resource "azurerm_cosmosdb_mongo_database" "main" {
  name                = "clintendev"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name
  throughput          = 400
}

resource "azurerm_cosmosdb_mongo_database" "stage" {
  name                = "clintendev-stage"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name
  throughput          = 400
}

resource "azurerm_cosmosdb_mongo_collection" "links" {
  name                = "links"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_mongo_database.main.name

  index {
    keys   = ["slug"]
    unique = true
  }

  index {
    keys   = ["createdAt"]
    unique = false
  }

  index {
    keys   = ["_id"]
    unique = true
  }
}

resource "azurerm_cosmosdb_mongo_collection" "users" {
  name                = "users"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_mongo_database.main.name

  index {
    keys   = ["email"]
    unique = true
  }

  index {
    keys   = ["apiToken"]
    unique = true
  }

  index {
    keys   = ["_id"]
    unique = true
  }
}

resource "azurerm_cosmosdb_mongo_collection" "links_stage" {
  name                = "links"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_mongo_database.stage.name

  index {
    keys   = ["slug"]
    unique = true
  }

  index {
    keys   = ["createdAt"]
    unique = false
  }

  index {
    keys   = ["_id"]
    unique = true
  }
}

resource "azurerm_cosmosdb_mongo_collection" "users_stage" {
  name                = "users"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_mongo_database.stage.name

  index {
    keys   = ["email"]
    unique = true
  }

  index {
    keys   = ["apiToken"]
    unique = true
  }

  index {
    keys   = ["_id"]
    unique = true
  }
}