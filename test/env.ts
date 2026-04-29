export const getEnv = () => {
  const {
    CFTOOLS_APPLICATION_ID,
    CFTOOLS_APPLICATION_SECRET,
    CFTOOLS_ENTERPRISE_TOKEN,
    CFTOOLS_SERVER_API_ID,
    SERVER_ID,
    SERVER_IP,
    SERVER_PORT,
    BANLIST_ID,
    TEST_IP,
    TEST_CFTOOLS_ID,
    TEST_STEAM_ID,
    TEST_BATTLEYE_GUID,
    TEST_BOHEMIA_INTERACTIVE_UID,
  } = process.env;

  if (!CFTOOLS_APPLICATION_ID) {
    throw new Error("CFTOOLS_APPLICATION_ID is not defined");
  }

  if (!CFTOOLS_APPLICATION_SECRET) {
    throw new Error("CFTOOLS_APPLICATION_SECRET is not defined");
  }

  if (!CFTOOLS_SERVER_API_ID) {
    throw new Error("CFTOOLS_SERVER_API_ID is not defined");
  }

  if (!SERVER_ID) {
    throw new Error("SERVER_ID is not defined");
  }

  if (!SERVER_IP) {
    throw new Error("SERVER_IP is not defined");
  }

  if (!SERVER_PORT) {
    throw new Error("SERVER_PORT is not defined");
  }

  return {
    CFTOOLS_APPLICATION_ID,
    CFTOOLS_APPLICATION_SECRET,
    CFTOOLS_ENTERPRISE_TOKEN,
    CFTOOLS_SERVER_API_ID,
    SERVER_ID,
    SERVER_IP,
    SERVER_PORT,
    BANLIST_ID,
    TEST_IP,
    TEST_CFTOOLS_ID,
    TEST_STEAM_ID,
    TEST_BATTLEYE_GUID,
    TEST_BOHEMIA_INTERACTIVE_UID,
  };
}