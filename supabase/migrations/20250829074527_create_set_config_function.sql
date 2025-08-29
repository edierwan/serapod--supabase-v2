-- A simple wrapper function to allow calling set_config from an authenticated user.
-- This is used by the API to scope all subsequent queries to the user's Product Group.
CREATE OR REPLACE FUNCTION set_config(name TEXT, value TEXT, is_local BOOLEAN)
RETURNS TEXT AS $$
BEGIN
  PERFORM set_config(name, value, is_local);
  RETURN value;
END;
$$ LANGUAGE plpgsql;