import { json } from "@remix-run/react";
import { CodepushService } from "~/.server/services/Codepush";
import { authenticateLoaderRequest } from "~/utils/authenticate";

export const loader = authenticateLoaderRequest(async ({ user }) => {
  // try {
    return json({ data: { termsAccepted: true } }, { status: 200 });
  //   const { data, status } = await CodepushService.getOwnerTermsStatus({
  //     userId: user.user.id,
  //   });
  //   return json(data, { status });
  // } catch (error) {
  //   console.error('Error fetching owner terms status:', error);
  //   return json(
  //     { error: "Failed to fetch terms status" },
  //     { status: 500 }
  //   );
  // }
});
