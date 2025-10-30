import { storage } from "../storage";

export class AlertMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private lastAlertTime: Map<string, number> = new Map();

  // Minimum time between alerts for the same rule (5 minutes)
  private readonly ALERT_COOLDOWN = 5 * 60 * 1000;

  async checkAlertRules() {
    try {
      const rules = await storage.getAlertRules();
      const enabledRules = rules.filter(r => r.enabled);

      if (enabledRules.length === 0) {
        return;
      }

      // Get metrics for evaluation
      const metrics = await storage.getAggregatedMetrics("24h");
      const routePerformance = await storage.getRoutePerformance("24h");

      for (const rule of enabledRules) {
        await this.evaluateRule(rule, metrics, routePerformance);
      }
    } catch (error) {
      console.error("[AlertMonitor] Error checking alert rules:", error);
    }
  }

  private async evaluateRule(rule: any, metrics: any, routePerformance: any[]) {
    try {
      let currentValue: number | undefined;
      let routeName = rule.routeType || "All Routes";

      // Get the current value for the metric
      switch (rule.metric) {
        case "success_rate":
          if (rule.routeType) {
            const route = routePerformance.find(r => r.route === rule.routeType);
            currentValue = route ? parseFloat(route.successRate) : undefined;
          } else {
            currentValue = parseFloat(metrics.successRate);
          }
          break;

        case "avg_cost":
          if (rule.routeType) {
            const route = routePerformance.find(r => r.route === rule.routeType);
            currentValue = route ? parseFloat(route.totalCost) / parseFloat(route.totalTransactions) : undefined;
          } else {
            currentValue = parseFloat(metrics.totalCost) / parseFloat(metrics.totalTransactions.replace(/,/g, ''));
          }
          break;

        case "confirmation_time":
          if (rule.routeType) {
            const route = routePerformance.find(r => r.route === rule.routeType);
            currentValue = route ? parseFloat(route.avgConfirmationTime) : undefined;
          } else {
            currentValue = parseFloat(metrics.avgConfirmation);
          }
          break;

        default:
          console.warn(`[AlertMonitor] Unknown metric: ${rule.metric}`);
          return;
      }

      if (currentValue === undefined) {
        return;
      }

      const threshold = parseFloat(rule.threshold.toString());
      let shouldAlert = false;

      // Check if threshold is breached
      if (rule.condition === "above" && currentValue > threshold) {
        shouldAlert = true;
      } else if (rule.condition === "below" && currentValue < threshold) {
        shouldAlert = true;
      }

      if (shouldAlert) {
        await this.triggerAlert(rule, currentValue, routeName);
      }
    } catch (error) {
      console.error(`[AlertMonitor] Error evaluating rule ${rule.id}:`, error);
    }
  }

  private async triggerAlert(rule: any, currentValue: number, routeName: string) {
    const ruleKey = `${rule.id}-${routeName}`;
    const lastAlert = this.lastAlertTime.get(ruleKey) || 0;
    const now = Date.now();

    // Check cooldown period
    if (now - lastAlert < this.ALERT_COOLDOWN) {
      return;
    }

    this.lastAlertTime.set(ruleKey, now);

    // Determine severity
    let severity: "info" | "warning" | "critical" = "warning";
    const threshold = parseFloat(rule.threshold.toString());
    const deviation = Math.abs(currentValue - threshold) / threshold;

    if (deviation > 0.5) {
      severity = "critical";
    } else if (deviation > 0.2) {
      severity = "warning";
    } else {
      severity = "info";
    }

    // Format the message
    const metricLabel = rule.metric.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
    let valueStr = currentValue.toFixed(2);
    if (rule.metric === "success_rate") {
      valueStr = currentValue.toFixed(1) + "%";
    } else if (rule.metric === "confirmation_time") {
      valueStr = currentValue.toFixed(1) + "s";
    } else if (rule.metric === "avg_cost") {
      valueStr = currentValue.toFixed(4) + " SOL";
    }

    const message = `${metricLabel} for ${routeName} is ${rule.condition} threshold: ${valueStr} (threshold: ${threshold}${rule.metric === "success_rate" ? "%" : ""})`;

    // Create the alert
    const alert = await storage.createAlert({
      type: "threshold",
      title: rule.name,
      message,
      severity,
      source: "system",
    });

    console.log(`[AlertMonitor] Alert triggered: ${rule.name} - ${message}`);

    // Send webhook if configured
    if (rule.webhookUrl) {
      await this.sendWebhook(rule.webhookUrl, alert, currentValue, threshold);
    }
  }

  private async sendWebhook(webhookUrl: string, alert: any, currentValue: number, threshold: number) {
    try {
      // Detect webhook type based on URL
      const isDiscord = webhookUrl.includes("discord.com");
      const isSlack = webhookUrl.includes("slack.com");

      let payload: any;

      if (isDiscord) {
        // Discord webhook format
        const severityColors: Record<string, number> = {
          info: 0x3498db,      // Blue
          warning: 0xf39c12,   // Orange
          critical: 0xe74c3c,  // Red
        };
        const severityColor = severityColors[alert.severity] || 0x95a5a6; // Gray default

        payload = {
          embeds: [
            {
              title: `🚨 ${alert.title}`,
              description: alert.message,
              color: severityColor,
              fields: [
                {
                  name: "Severity",
                  value: alert.severity.toUpperCase(),
                  inline: true,
                },
                {
                  name: "Current Value",
                  value: currentValue.toFixed(2),
                  inline: true,
                },
                {
                  name: "Threshold",
                  value: threshold.toString(),
                  inline: true,
                },
              ],
              timestamp: new Date(alert.createdAt).toISOString(),
              footer: {
                text: "The Observatory Alert System",
              },
            },
          ],
        };
      } else {
        // Slack webhook format (default)
        payload = {
          text: `🚨 ${alert.title}`,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: alert.title,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Severity:* ${alert.severity}\n*Message:* ${alert.message}\n*Time:* ${new Date(alert.createdAt).toLocaleString()}`,
              },
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*Current Value:*\n${currentValue.toFixed(2)}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Threshold:*\n${threshold}`,
                },
              ],
            },
          ],
        };
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`[AlertMonitor] Webhook failed: ${response.statusText}`);
      } else {
        console.log(`[AlertMonitor] Webhook sent successfully to ${webhookUrl} (${isDiscord ? 'Discord' : isSlack ? 'Slack' : 'Generic'})`);
      }
    } catch (error) {
      console.error(`[AlertMonitor] Error sending webhook:`, error);
    }
  }

  start(intervalMs: number = 60000) {
    if (this.intervalId) {
      console.log("[AlertMonitor] Already running");
      return;
    }

    console.log(`[AlertMonitor] Starting (interval: ${intervalMs}ms)...`);
    
    // Run immediately
    this.checkAlertRules();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.checkAlertRules();
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[AlertMonitor] Stopped");
    }
  }
}

export const alertMonitor = new AlertMonitor();
