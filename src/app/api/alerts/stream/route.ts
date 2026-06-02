import { prisma } from '@/lib/prisma';

// SSE stream for real-time risk alerts
export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      // Send initial connection ack
      send('connected', JSON.stringify({ time: new Date().toISOString() }));

      let lastCheck = new Date();
      let isClosed = false;

      // Poll every 8 seconds for new alerts
      const interval = setInterval(async () => {
        if (isClosed) return;
        try {
          const newAlerts = await prisma.riskAlert.findMany({
            where: {
              isActive: true,
              createdAt: { gt: lastCheck },
            },
            include: { intern: { include: { position: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5,
          });

          if (newAlerts.length > 0) {
            lastCheck = new Date();
            send('alerts', JSON.stringify({
              count: newAlerts.length,
              alerts: newAlerts.map(a => ({
                id: a.id,
                internName: a.intern.name,
                position: a.intern.position.name,
                type: a.type,
                level: a.level,
                reason: a.reason,
                createdAt: a.createdAt,
              })),
            }));
          }
        } catch {
          // ignore DB errors in stream
        }
      }, 8000);

      // Heartbeat every 25s to keep connection alive
      const heartbeat = setInterval(() => {
        if (isClosed) return;
        send('heartbeat', JSON.stringify({ time: new Date().toISOString() }));
      }, 25000);

      // Close stream when client disconnects
      const cleanup = () => {
        isClosed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        controller.close();
      };
      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
