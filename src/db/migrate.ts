import { db } from "./index.js";

async function migrate() {
  console.log("Running migrations...");
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      bio TEXT,
      avatar_url TEXT,
      is_admin BOOLEAN NOT NULL DEFAULT false,
      actor_id TEXT UNIQUE,
      private_key TEXT,
      public_key TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      location TEXT,
      image_url TEXT,
      capacity INTEGER,
      visibility TEXT NOT NULL DEFAULT 'public',
      organizer_id INTEGER NOT NULL REFERENCES users(id),
      is_local BOOLEAN NOT NULL DEFAULT true,
      remote_id TEXT,
      remote_instance TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS events_organizer_idx ON events(organizer_id);
    CREATE INDEX IF NOT EXISTS events_start_time_idx ON events(start_time);
    CREATE INDEX IF NOT EXISTS events_visibility_idx ON events(visibility);

    DO $$ BEGIN
      CREATE TYPE rsvp_status AS ENUM ('yes', 'no', 'maybe');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS rsvps (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      event_id INTEGER NOT NULL REFERENCES events(id),
      status rsvp_status NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS rsvps_user_event_idx ON rsvps(user_id, event_id);
    CREATE INDEX IF NOT EXISTS rsvps_event_idx ON rsvps(event_id);

    CREATE TABLE IF NOT EXISTS followers (
      id SERIAL PRIMARY KEY,
      actor_id TEXT NOT NULL UNIQUE,
      inbox_url TEXT NOT NULL,
      shared_inbox_url TEXT,
      following BOOLEAN NOT NULL DEFAULT false,
      followed_by BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invite_codes (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      used_by INTEGER REFERENCES users(id),
      used_at TIMESTAMP,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS blocked_instances (
      id SERIAL PRIMARY KEY,
      domain TEXT NOT NULL UNIQUE,
      reason TEXT,
      blocked_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS instance_config (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value JSONB NOT NULL
    );
  `);
  console.log("Migrations complete.");
}

migrate().catch(console.error);
