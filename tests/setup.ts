import dns from "node:dns";

// The same fix scripts/supabase-remote.mjs and every manual test cycle in
// this project has needed: Node's own resolver intermittently fails on
// this network even though the OS resolver works fine.
dns.setDefaultResultOrder("ipv4first");
