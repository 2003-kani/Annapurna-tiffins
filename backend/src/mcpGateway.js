// MCP gateway abstraction: route order requests to appropriate restaurant connector.
// Replace this with real MCP SDK/server calls when your MCP server is ready.

export async function routeOrderViaMcp({ restaurantCode, orderPayload }) {
  return {
    provider: "local-sql-fallback",
    restaurantCode,
    accepted: true,
    externalOrderRef: `MCP-${Date.now()}`,
    payloadEcho: orderPayload
  };
}
