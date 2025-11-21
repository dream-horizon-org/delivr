/**
 * Bitbucket SCM Controller (Stub)
 * To be implemented when Bitbucket integration is ready
 */

import { Request, Response } from "express";

export async function verifyBitbucketConnection(req: Request, res: Response): Promise<any> {
  return res.status(501).json({
    success: false,
    error: "Bitbucket integration not yet implemented"
  });
}

export async function createBitbucketConnection(req: Request, res: Response): Promise<any> {
  return res.status(501).json({
    success: false,
    error: "Bitbucket integration not yet implemented"
  });
}

export async function getBitbucketConnection(req: Request, res: Response): Promise<any> {
  return res.status(501).json({
    success: false,
    error: "Bitbucket integration not yet implemented"
  });
}

export async function updateBitbucketConnection(req: Request, res: Response): Promise<any> {
  return res.status(501).json({
    success: false,
    error: "Bitbucket integration not yet implemented"
  });
}

export async function deleteBitbucketConnection(req: Request, res: Response): Promise<any> {
  return res.status(501).json({
    success: false,
    error: "Bitbucket integration not yet implemented"
  });
}

