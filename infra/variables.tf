variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus"
}

variable "project" {
  description = "Short project name used in resource naming"
  type        = string
  default     = "clinten"
}

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "terraform_runner_ip" {
  description = "IP address allowed to access Key Vault during terraform apply (e.g. your local machine)"
  type        = string
}