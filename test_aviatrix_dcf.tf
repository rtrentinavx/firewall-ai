# Test Aviatrix DCF Ruleset parsing

data "aviatrix_dcf_attachment_point" "tf_before_ui" {
    name = "TERRAFORM_BEFORE_UI_MANAGED"
}

resource "aviatrix_dcf_ruleset" "test_ruleset" {
  attach_to = data.aviatrix_dcf_attachment_point.tf_before_ui.id
  name = "Test production ruleset"
  
  rules {
    name             = "deny-icmp"
    action           = "DENY"
    priority         = 1
    protocol         = "ICMP"
    logging          = true
    watch            = false
    src_smart_groups = [
      "f15c9890-c8c4-4c1a-a2b5-ef0ab34d2e30"
    ]
    dst_smart_groups = [
      "82e50c85-82bf-4b3b-b9da-aaed34a3aa53"
    ]
    tls_profile = "def000ad-6000-0000-0000-000000000001"
  }

  rules {
    name             = "allow-web-traffic"
    action           = "PERMIT"
    priority         = 0
    protocol         = "TCP"
    src_smart_groups = [
      "7e7d1573-7a7a-4a53-bcb5-1ad5041961e0"
    ]
    dst_smart_groups = [
      "f05b0ad7-d2d7-4d16-b2f6-48492319414c"
    ]

    port_ranges {
      hi = 443
      lo = 443
    }
    
    port_ranges {
      hi = 50000
      lo = 49000
    }
  }
  
  rules {
    name                     = "dpi-rule"
    action                   = "DEEP_PACKET_INSPECTION_PERMIT"
    priority                 = 2
    protocol                 = "ANY"
    logging                  = true
    watch                    = false
    exclude_sg_orchestration = true
    src_smart_groups         = [
      "f15c9890-c8c4-4c1a-a2b5-ef0ab34d2e30"
    ]
    dst_smart_groups         = [
      "82e50c85-82bf-4b3b-b9da-aaed34a3aa53"
    ]
    web_groups               = [
      "6bff3e91-3707-4582-9ea6-70e37b08760b"
    ]
    flow_app_requirement     = "TLS_REQUIRED"
    decrypt_policy           = "DECRYPT_ALLOWED"
    
    port_ranges {
      hi = 8443
      lo = 8080
    }
  }
}
