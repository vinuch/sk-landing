# Changelog

All notable changes to the Satellite Kitchen website will be documented in this file.

## [Unreleased]

### Added
- **Delivery Fee Persistence**
  - Added `delivery_fee` column to Orders table (numeric)
  - Updated `/api/bank-transfer/create-order` to save delivery_fee from cart
  - Updated Cart page to pass delivery_fee when creating orders
  - Updated Admin Verify Orders page to display saved delivery_fee
  - Created SQL migration: `migrations/20260314_add_delivery_fee.sql`

### Changed
- **Order Buttons Updated**
  - Changed "Order on WhatsApp" → "Order on Chowdeck" in footer and nav
  - Updated link to Chowdeck store: `https://store.chowdeck.com/amuwo-odofin-1/restaurants/satellite-kitchen9pt53j`
  - Added `target="_blank" rel="noopener noreferrer"` for security

### Added
- **Chowdeck Delivery Integration**
  - New API route `/api/delivery/quote` - POST endpoint to get delivery fee quotes from Chowdeck
    - Accepts: pickup_address, delivery_address, items
    - Returns: delivery_fee, estimated_time, available (true/false)
    - Handles errors gracefully
  - New API route `/api/delivery/book` - POST endpoint to book a Chowdeck rider
    - Accepts: order_id, pickup_address, delivery_address, items, customer_phone
    - Returns: delivery_id, rider_name, rider_phone, tracking_url
    - Saves delivery_id to orders table
  - Updated Cart page (`/cart`)
    - After address selection, calls `/api/delivery/quote` to get real-time delivery fee
    - Shows delivery fee from Chowdeck (replaces fixed tier pricing)
    - If unavailable: shows "Sorry, we don't deliver there"
    - If available: shows fee with estimated delivery time, allows checkout
    - Delivery fee is added to order total
  - Updated Admin Verify Orders page (`/admin/verify-orders`)
    - After "Confirm Payment" button, shows "Book Rider" button
    - Click calls `/api/delivery/book` API
    - Shows rider details (name, phone, tracking URL) after successful booking
    - Updates order status to "rider_assigned"
  - Database migration to add delivery fields to Orders table
    - `delivery_id`: Chowdeck delivery tracking ID
    - `rider_name`: Name of assigned rider
    - `rider_phone`: Phone number of assigned rider
    - `tracking_url`: Chowdeck tracking URL for customers

## [Previous Versions]

*Note: Previous changelog entries were not maintained. This file starts from the Chowdeck integration.*
