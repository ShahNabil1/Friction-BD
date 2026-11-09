-- Update the order_created email template subject
UPDATE email_templates 
SET subject = 'Order Received - Processing #{{order_id}}'
WHERE trigger_event = 'order_created';