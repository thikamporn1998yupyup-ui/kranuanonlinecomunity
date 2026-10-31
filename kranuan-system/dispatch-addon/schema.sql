
CREATE TABLE IF NOT EXISTS dispatch_payees(user_id TEXT PRIMARY KEY,phone TEXT NOT NULL,name TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',version INTEGER NOT NULL DEFAULT 1,review_note TEXT NOT NULL DEFAULT '',reviewer_id TEXT,reviewed_at TEXT,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS dispatch_messages(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,sender_id TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL,client_key TEXT NOT NULL,UNIQUE(sender_id,client_key));
CREATE INDEX IF NOT EXISTS dispatch_messages_order ON dispatch_messages(order_id,created_at);
CREATE TABLE IF NOT EXISTS dispatch_payments(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,customer_id TEXT NOT NULL,rider_id TEXT NOT NULL,purpose TEXT NOT NULL,amount_satang INTEGER NOT NULL,phone TEXT NOT NULL,payee_name TEXT NOT NULL,payee_version INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'pending',slip TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,reported_at TEXT,confirmed_at TEXT,confirmed_by TEXT,bank_reference TEXT NOT NULL DEFAULT '',client_key TEXT NOT NULL,UNIQUE(customer_id,client_key));
CREATE UNIQUE INDEX IF NOT EXISTS dispatch_one_fare ON dispatch_payments(order_id) WHERE purpose='fare' AND state<>'void';
CREATE TABLE IF NOT EXISTS dispatch_notices(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,order_id TEXT,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL,read_at TEXT);

CREATE UNIQUE INDEX IF NOT EXISTS dispatch_unique_bank_ref ON dispatch_payments(rider_id,bank_reference) WHERE state='confirmed' AND bank_reference<>'';

CREATE TABLE IF NOT EXISTS dispatch_food_receipts(order_id TEXT PRIMARY KEY,customer_id TEXT NOT NULL,rider_id TEXT NOT NULL,amount_satang INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'reported',note TEXT NOT NULL DEFAULT '',slip TEXT NOT NULL DEFAULT '',reported_at TEXT NOT NULL,confirmed_at TEXT,confirmed_by TEXT,decision_note TEXT NOT NULL DEFAULT '');
CREATE UNIQUE INDEX IF NOT EXISTS dispatch_one_collection ON dispatch_payments(order_id) WHERE purpose IN ('collection','collection_cash') AND state<>'void';

CREATE INDEX IF NOT EXISTS dispatch_message_order_time ON dispatch_messages(order_id,created_at);
CREATE INDEX IF NOT EXISTS dispatch_payment_order_time ON dispatch_payments(order_id,created_at);
CREATE INDEX IF NOT EXISTS dispatch_notice_user_time ON dispatch_notices(user_id,created_at);

CREATE TABLE IF NOT EXISTS dispatch_community_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  client_key TEXT NOT NULL,
  UNIQUE(sender_id, client_key)
);

CREATE INDEX IF NOT EXISTS dispatch_community_time
ON dispatch_community_messages(created_at);
