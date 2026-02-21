-- ============================================
-- DEMO SEED DATA (OPTIONAL)
-- ============================================
-- This block creates demo vendors, admins, categories, products,
-- templates, receipts, and receipt items for testing.
--
-- All inserts are idempotent: running this script multiple times will
-- not create duplicate demo data.

DO $$
DECLARE
  i integer;
  cat_idx integer;
  prod_idx integer;
  tpl_idx integer;
  r_idx integer;
  v_id uuid;
  super_admin_id uuid;
  demo_admin_id uuid;
  prod1_id uuid;
  vendor_key text;
  vendor_name text;
  vendor_email text;
  super_email text;
  admin_email text;
  tpl_name text;
  receipt_num text;
  status_text text;
  common_email text;
BEGIN
  -- Two common admins shared across all demo vendors
  INSERT INTO users (email, name, role)
  VALUES
    ('common_admin1@demo.local', 'Common Admin 1', 'admin'),
    ('common_admin2@demo.local', 'Common Admin 2', 'admin')
  ON CONFLICT (email) DO NOTHING;

  -- Create 5 demo vendors with their own super admin and extra admin
  FOR i IN 1..5 LOOP
    vendor_key := format('demo_vendor_%s', i);
    vendor_name := format('Demo Vendor %s', i);
    vendor_email := format('vendor%s@demo.local', i);
    super_email := format('vendor%s_superadmin@demo.local', i);
    admin_email := format('vendor%s_admin@demo.local', i);

    -- Ensure vendor-specific admins exist
    INSERT INTO users (email, name, role)
    VALUES (super_email, format('Vendor %s Super Admin', i), 'admin')
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO users (email, name, role)
    VALUES (admin_email, format('Vendor %s Admin', i), 'admin')
    ON CONFLICT (email) DO NOTHING;

    -- Ensure vendor exists
    INSERT INTO vendors (vendor_id, name, email, status)
    VALUES (vendor_key, vendor_name, vendor_email, 'active')
    ON CONFLICT (vendor_id) DO NOTHING;

    -- Load ids
    SELECT id INTO v_id FROM vendors WHERE vendor_id = vendor_key;
    SELECT id INTO super_admin_id FROM users WHERE email = super_email;
    SELECT id INTO demo_admin_id FROM users WHERE email = admin_email;
    prod1_id := NULL;

    IF v_id IS NULL OR super_admin_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Link vendor_admins: super admin
    INSERT INTO vendor_admins (vendor_id, admin_id, is_vendor_super_admin)
    SELECT v_id, super_admin_id, TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM vendor_admins va
      WHERE va.admin_id = super_admin_id
    );

    -- Extra admin per vendor (non super admin)
    IF demo_admin_id IS NOT NULL THEN
      INSERT INTO vendor_admins (vendor_id, admin_id, is_vendor_super_admin)
      SELECT v_id, demo_admin_id, FALSE
      WHERE NOT EXISTS (
        SELECT 1 FROM vendor_admins va
        WHERE va.admin_id = demo_admin_id
      );
    END IF;

    -- Two common admins mapped to every demo vendor (non super admins)
    FOR common_email IN SELECT unnest(ARRAY['common_admin1@demo.local','common_admin2@demo.local']) LOOP
      INSERT INTO vendor_admins (vendor_id, admin_id, is_vendor_super_admin)
      SELECT v_id, u.id, FALSE
      FROM users u
      WHERE u.email = common_email
        AND NOT EXISTS (
          SELECT 1 FROM vendor_admins va
          WHERE va.admin_id = u.id
        );
    END LOOP;

    -- Three categories per vendor
    FOR cat_idx IN 1..3 LOOP
      INSERT INTO categories (name, vendor_id, image_url)
      SELECT format('Demo Category %s', cat_idx), v_id, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c
        WHERE c.vendor_id = v_id AND c.name = format('Demo Category %s', cat_idx)
      );
    END LOOP;

    -- Three products per vendor, each tied to one of the categories
    FOR prod_idx IN 1..3 LOOP
      INSERT INTO products (name, description, price, category_id, image_url, tax_enabled, vendor_id)
      SELECT
        format('Demo Product %s (Vendor %s)', prod_idx, i),
        format('Sample product %s for %s', prod_idx, vendor_name),
        prod_idx * 10.00,
        c.id,
        NULL,
        TRUE,
        v_id
      FROM categories c
      WHERE c.vendor_id = v_id AND c.name = format('Demo Category %s', prod_idx)
        AND NOT EXISTS (
          SELECT 1 FROM products p
          WHERE p.vendor_id = v_id
            AND p.name = format('Demo Product %s (Vendor %s)', prod_idx, i)
        );
    END LOOP;

    -- Remember the first demo product id for creating simple receipt items
    SELECT id INTO prod1_id
    FROM products
    WHERE vendor_id = v_id
      AND name = format('Demo Product 1 (Vendor %s)', i)
    LIMIT 1;

    -- Three templates per vendor (all using a classic reusable layout)
    FOR tpl_idx IN 1..3 LOOP
      tpl_name := format('Demo Classic Template %s (Vendor %s)', tpl_idx, i);

      INSERT INTO receipt_templates (name, description, template_html, created_by, vendor_id)
      SELECT
        tpl_name,
        format('Classic receipt template %s for %s', tpl_idx, vendor_name),
        '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 700px; margin: 0 auto; padding: 32px; color: #111827; background-color: #ffffff; }
    h1, h2, h3 { margin: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 24px; }
    .company { font-size: 20px; font-weight: 700; }
    .company-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .meta { text-align: right; font-size: 12px; color: #6b7280; }
    .meta-label { text-transform: uppercase; letter-spacing: .05em; font-size: 11px; }
    .meta-value { font-weight: 600; color: #111827; margin-top: 2px; }
    .section-title { font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: .08em; margin-bottom: 6px; }
    .customer { margin-bottom: 20px; }
    .customer-main { font-weight: 600; font-size: 14px; color: #111827; }
    .customer-sub { font-size: 13px; color: #4b5563; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
    table.items th { padding: 8px 6px; border-bottom: 1px solid #e5e7eb; font-size: 11px; text-transform: uppercase; text-align: left; color: #6b7280; }
    table.items td { padding: 8px 6px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #111827; }
    table.items td.qty { text-align: center; width: 60px; }
    table.items td.price, table.items td.amount { text-align: right; width: 90px; }
    .totals { margin-top: 12px; max-width: 260px; margin-left: auto; font-size: 13px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; color: #4b5563; }
    .total-row.total { border-top: 2px solid #e5e7eb; margin-top: 6px; padding-top: 8px; font-weight: 700; color: #111827; font-size: 14px; }
    .status { margin-top: 16px; font-size: 12px; color: #374151; }
    .footer { margin-top: 24px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">{{COMPANY_NAME}}</div>
      <div class="company-sub">{{COMPANY_EMAIL}}</div>
    </div>
    <div class="meta">
      <div>
        <div class="meta-label">Receipt</div>
        <div class="meta-value">{{RECEIPT_ID}}</div>
      </div>
      <div style="margin-top: 8px;">
        <div class="meta-label">Date</div>
        <div class="meta-value">{{DATE}}</div>
      </div>
    </div>
  </div>

  <div class="customer">
    <div class="section-title">Billed To</div>
    <div class="customer-main">{{CUSTOMER_NAME}}</div>
    <div class="customer-sub">{{CUSTOMER_EMAIL}}</div>
    <div class="customer-sub">{{CUSTOMER_COMPANY}}</div>
  </div>

  <div>
    <div class="section-title">Items</div>
    <table class="items">
      <thead>
        <tr>
          <th>Description</th>
          <th class="qty">Qty</th>
          <th class="price">Price</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        {{ITEMS}}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <div class="total-row">
      <span>Subtotal</span>
      <span>{{SUBTOTAL}}</span>
    </div>
    <div class="total-row">
      <span>Tax</span>
      <span>{{TAX}}</span>
    </div>
    <div class="total-row total">
      <span>Total</span>
      <span>{{TOTAL}}</span>
    </div>
  </div>

  <div class="status">
    Payment status: <strong>{{STATUS}}</strong>
  </div>

  <div class="footer">
    {{FOOTER_MESSAGE}}
  </div>
</body>
</html>',
        super_admin_id,
        v_id
      WHERE NOT EXISTS (
        SELECT 1 FROM receipt_templates t
        WHERE t.vendor_id = v_id AND t.name = tpl_name
      );
    END LOOP;

    -- Three receipts per vendor, each using one of the templates
    FOR r_idx IN 1..3 LOOP
      receipt_num := format('DEMO-V%s-00%s', i, r_idx);
      tpl_name := format('Demo Template %s (Vendor %s)', r_idx, i);
      status_text := CASE r_idx WHEN 1 THEN 'paid' WHEN 2 THEN 'sent' ELSE 'draft' END;

      INSERT INTO receipts (receipt_number, template_id, created_by, vendor_id, customer_name, customer_email, subtotal, tax, total, status)
      SELECT
        receipt_num,
        t.id,
        super_admin_id,
        v_id,
        format('Demo Customer %s (Vendor %s)', r_idx, i),
        format('customer%s.vendor%s@demo.local', r_idx, i),
        (r_idx * 30.00)::DECIMAL(10, 2),
        (r_idx * 5.00)::DECIMAL(10, 2),
        (r_idx * 35.00)::DECIMAL(10, 2),
        status_text
      FROM receipt_templates t
      WHERE t.vendor_id = v_id AND t.name = tpl_name
        AND NOT EXISTS (
          SELECT 1 FROM receipts r WHERE r.receipt_number = receipt_num
        );

      -- Simple single item for each demo receipt
      IF prod1_id IS NOT NULL THEN
        INSERT INTO receipt_items (receipt_id, product_id, name, quantity, unit_price, total)
        SELECT
          r.id,
          prod1_id,
          'Demo Item',
          1,
          10.00,
          10.00
        FROM receipts r
        WHERE r.receipt_number = receipt_num
          AND NOT EXISTS (
            SELECT 1 FROM receipt_items ri
            WHERE ri.receipt_id = r.id AND ri.product_id = prod1_id
          );
      END IF;
    END LOOP;

  END LOOP;
END;
$$ LANGUAGE plpgsql;
