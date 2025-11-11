import { json } from "@remix-run/node";
import { CodepushService } from "~/.server/services/Codepush";
import { authenticateLoaderRequest } from "~/utils/authenticate";

export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { tenantId } = params;
  
  if (!tenantId) {
    throw new Response("Tenant ID is required", { status: 400 });
  }

  try {
    const { data, status } = await CodepushService.getTenantInfo({
      userId: user.user.id,
      tenantId
    });
    return json(data, { status });
  } catch (error: any) {
    console.error("Error fetching tenant info:", error);
    if (error.response) {
      return json(error.response.data, { status: error.response.status });
    }
    throw new Response("Failed to fetch tenant info", { status: 500 });
  }
});

