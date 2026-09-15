import { Response, Request } from 'express';
import { logger } from '../config/logger';
import prisma from '../config/database';

// Public endpoint: the latest published app version
export const getLatestVersion = async (_req: Request, res: Response): Promise<void> => {
  try {
    const version = await prisma.appVersion.findFirst({
      where: { isLatest: true },
      orderBy: { versionCode: 'desc' },
    });

    if (!version) {
      res.status(404).json({
        success: false,
        error: { message: 'No version published yet.', statusCode: 404 },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        platform: version.platform,
        versionName: version.versionName,
        versionCode: version.versionCode,
        downloadUrl: version.downloadUrl,
        notes: version.notes,
      },
    });
  } catch (error) {
    logger.error('[Version] Error fetching latest version:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch latest version.', statusCode: 500 },
    });
  }
};

// Admin endpoint: publish a new version (marks previous rows as not latest)
export const setVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { versionName, versionCode, downloadUrl, notes } = req.body ?? {};

    if (!versionName || typeof versionCode !== 'number' || Number.isNaN(versionCode) || !downloadUrl) {
      res.status(400).json({
        success: false,
        error: { message: 'versionName, versionCode (number) and downloadUrl are required.', statusCode: 400 },
      });
      return;
    }

    const versionCodeInt = Math.round(versionCode);
    const platform = typeof req.body?.platform === 'string' && req.body.platform ? req.body.platform : 'android';

    // Demote any existing latest row before publishing the new one
    await prisma.appVersion.updateMany({
      where: { platform },
      data: { isLatest: false },
    });

    const version = await prisma.appVersion.create({
      data: {
        platform,
        versionName: String(versionName),
        versionCode: versionCodeInt,
        downloadUrl: String(downloadUrl),
        notes: typeof notes === 'string' && notes ? notes : null,
        isLatest: true,
      },
    });

    logger.info(`[Version] Published new ${platform} version ${versionName} (code ${versionCodeInt})`);

    res.status(201).json({
      success: true,
      data: {
        id: version.id,
        platform: version.platform,
        versionName: version.versionName,
        versionCode: version.versionCode,
        downloadUrl: version.downloadUrl,
        notes: version.notes,
      },
    });
  } catch (error) {
    logger.error('[Version] Error publishing version:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to publish version.', statusCode: 500 },
    });
  }
};