#!/usr/bin/env python3
"""
Keep-Alive Script for Emergent Deployment
Pings the health endpoint every 5 minutes to prevent server sleep
"""
import asyncio
import aiohttp
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("keep_alive")

HEALTH_URL = "https://order-tracker-231.preview.emergentagent.com/api/health"
PING_INTERVAL = 300  # 5 minutes

async def ping_health():
    """Ping the health endpoint"""
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(HEALTH_URL, timeout=30) as response:
                if response.status == 200:
                    logger.info(f"[{datetime.now()}] Health check OK - Status: {response.status}")
                else:
                    logger.warning(f"[{datetime.now()}] Health check failed - Status: {response.status}")
        except Exception as e:
            logger.error(f"[{datetime.now()}] Health check error: {e}")

async def main():
    """Main loop - ping every PING_INTERVAL seconds"""
    logger.info(f"Starting keep-alive service - pinging every {PING_INTERVAL} seconds")
    while True:
        await ping_health()
        await asyncio.sleep(PING_INTERVAL)

if __name__ == "__main__":
    asyncio.run(main())
