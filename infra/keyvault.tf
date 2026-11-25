data "azurerm_client_config" "current" {}

# The vault's network firewall stays open (default_action = "Allow"). Azure Container Apps is NOT a
# "trusted Microsoft service" for Key Vault, so with "Deny" the apps can't resolve their Key Vault
# secret references and every container app goes to provisioningState=Failed. That took clinten.dev
# down from 2026-07-04 until 2026-11-25. Access is still gated by Entra ID auth and the access
# policies below. Locking the network down again needs a VNet-integrated Container Apps environment
# plus a private endpoint, not an IP allow-list (Consumption outbound IPs aren't guaranteed static).
#trivy:ignore:AVD-AZU-0013
resource "azurerm_key_vault" "main" {
  name                       = "${var.project}-kv"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false

  network_acls {
    default_action = "Allow"
    bypass         = "AzureServices"
    ip_rules       = [var.terraform_runner_ip]
  }
}

resource "azurerm_key_vault_access_policy" "terraform" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = ["Get", "Set", "Delete", "List", "Purge"]
}

resource "azurerm_key_vault_secret" "mongodb_uri" {
  name         = "mongodb-uri"
  value        = azurerm_cosmosdb_account.main.primary_mongodb_connection_string
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault_access_policy.terraform]
}

resource "azurerm_key_vault_secret" "registry_password" {
  name         = "registry-password"
  value        = azurerm_container_registry.main.admin_password
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault_access_policy.terraform]
}