output "container_registry_url" {
  value = azurerm_container_registry.main.login_server
}

output "redirect_app_fqdn" {
  value = azurerm_container_app.redirect.ingress[0].fqdn
}

output "creator_api_fqdn" {
  value = azurerm_container_app.creator_api.ingress[0].fqdn
}

output "creator_ui_hostname" {
  value = azurerm_static_web_app.creator_ui.default_host_name
}

output "creator_ui_deployment_token" {
  value     = azurerm_static_web_app.creator_ui.api_key
  sensitive = true
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}