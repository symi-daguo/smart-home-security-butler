import {
  TrendAnalysisResult,
  AlertTrends,
  DeviceTrends,
  EnergyTrends,
  SecurityScore,
  ReportPeriod,
  ReportFormat,
  SecurityReport,
  TopRiskItem,
  DeviceHealthSummary,
  SeverityLevel,
  DetectionCategory,
  Alert,
} from '../types';
import { TrendAnalyzer } from './trend-analyzer';

export class ReportGenerator {
  private trendAnalyzer: TrendAnalyzer;

  constructor() {
    this.trendAnalyzer = new TrendAnalyzer();
  }

  public generateReport(
    analysis: TrendAnalysisResult,
    period: ReportPeriod,
    format: ReportFormat,
    alerts: Alert[],
  ): SecurityReport {
    const topRisks = this.identifyTopRisks(alerts, analysis);
    const deviceHealth = this.summarizeDeviceHealth(analysis.devices, alerts);
    const automationSuggestions = this.generateAutomationSuggestions(analysis);
    const recommendations = this.generateRecommendations(analysis);

    const criticalAlerts = analysis.alerts.bySeverity.find(
      (s) => s.severity === SeverityLevel.Critical,
    )?.count || 0;
    const highAlerts = analysis.alerts.bySeverity.find(
      (s) => s.severity === SeverityLevel.High,
    )?.count || 0;

    const summary = {
      totalAlerts: analysis.alerts.totalAlerts,
      resolvedAlerts: analysis.alerts.resolvedAlerts,
      resolutionRate: analysis.alerts.resolutionRate,
      criticalAlerts,
      highAlerts,
      securityScore: analysis.securityScore.overall,
      previousScore: analysis.securityScore.previousScore || analysis.securityScore.overall,
      scoreChange: analysis.securityScore.change,
    };

    const content =
      format === 'markdown'
        ? this.generateMarkdownReport(analysis, period, summary, topRisks, deviceHealth, recommendations)
        : this.generateTextReport(analysis, period, summary, topRisks, deviceHealth, recommendations);

    return {
      period,
      format,
      generatedAt: new Date(),
      startDate: analysis.startDate,
      endDate: analysis.endDate,
      summary,
      alertTrends: analysis.alerts,
      topRisks,
      deviceHealth,
      automationSuggestions,
      recommendations,
      content,
    };
  }

  private identifyTopRisks(alerts: Alert[], analysis: TrendAnalysisResult): TopRiskItem[] {
    const riskMap = new Map<string, TopRiskItem>();

    for (const alert of alerts) {
      const key = `${alert.category}-${alert.ruleId || alert.title}`;

      if (!riskMap.has(key)) {
        riskMap.set(key, {
          rank: 0,
          title: alert.title,
          description: alert.description,
          severity: alert.severity,
          category: alert.category,
          occurrenceCount: 0,
          firstOccurredAt: alert.firstDetectedAt,
          lastOccurredAt: alert.lastDetectedAt,
          affectedEntities: [],
          recommendation: this.getRiskRecommendation(alert),
        });
      }

      const risk = riskMap.get(key)!;
      risk.occurrenceCount++;

      if (alert.firstDetectedAt < risk.firstOccurredAt) {
        risk.firstOccurredAt = alert.firstDetectedAt;
      }
      if (alert.lastDetectedAt > risk.lastOccurredAt) {
        risk.lastOccurredAt = alert.lastDetectedAt;
      }
      if (alert.entityId && !risk.affectedEntities.includes(alert.entityId)) {
        risk.affectedEntities.push(alert.entityId);
      }
      if (alert.severity > risk.severity) {
        risk.severity = alert.severity;
      }
    }

    const sortedRisks = Array.from(riskMap.values()).sort((a, b) => {
      const severityDiff = b.severity - a.severity;
      if (severityDiff !== 0) return severityDiff;
      return b.occurrenceCount - a.occurrenceCount;
    });

    return sortedRisks.slice(0, 10).map((risk, index) => ({
      ...risk,
      rank: index + 1,
    }));
  }

  private getRiskRecommendation(alert: Alert): string {
    switch (alert.category) {
      case DetectionCategory.DeviceFault:
        return '检查设备连接状态和电源，必要时更换电池或维修设备';
      case DetectionCategory.DoorAccess:
        return '检查门锁状态，考虑添加门禁自动化和夜间检查';
      case DetectionCategory.AwayMode:
        return '检查离家模式安防配置，确保所有门窗和传感器正常工作';
      case DetectionCategory.EnergyAnomaly:
        return '排查高能耗设备，考虑添加能耗监控和节能自动化';
      case DetectionCategory.Environmental:
        return '立即检查环境传感器，确保烟雾/水浸/燃气探测器正常工作';
      default:
        return '进一步调查告警原因，采取适当的安全措施';
    }
  }

  private summarizeDeviceHealth(deviceTrends: DeviceTrends, alerts: Alert[]): DeviceHealthSummary {
    const faultAlerts = alerts.filter((a) => a.category === DetectionCategory.DeviceFault);
    const lowBatteryDevices = faultAlerts
      .filter((a) => a.title.toLowerCase().includes('battery') || a.title.toLowerCase().includes('电池'))
      .map((a) => a.entityId || '')
      .filter((e) => e);

    const criticalCount = alerts.filter((a) => a.severity === SeverityLevel.Critical).length;
    const highCount = alerts.filter((a) => a.severity === SeverityLevel.High).length;
    const warningCount = alerts.filter((a) => a.severity === SeverityLevel.Medium).length;

    let healthScore = 100;
    healthScore -= (1 - deviceTrends.currentOnlineRate) * 30;
    healthScore -= criticalCount * 5;
    healthScore -= highCount * 2;
    healthScore = Math.max(0, Math.min(100, healthScore));

    const healthyDevices = Math.max(0, deviceTrends.totalDevices - criticalCount - highCount - warningCount);

    return {
      totalDevices: deviceTrends.totalDevices,
      healthyDevices,
      warningDevices: warningCount,
      criticalDevices: criticalCount + highCount,
      onlineRate: deviceTrends.currentOnlineRate,
      lowBatteryDevices,
      offlineDevices: deviceTrends.offlineDevices,
      highFrequencyDevices: deviceTrends.highFrequencyDevices.map((d) => d.entityId),
      healthScore: Math.round(healthScore),
    };
  }

  private generateAutomationSuggestions(analysis: TrendAnalysisResult): string[] {
    const suggestions: string[] = [];

    if (analysis.alerts.byCategory.find((c) => c.category === DetectionCategory.DoorAccess)?.count || 0 > 2) {
      suggestions.push('创建夜间门窗检查自动化，每晚睡前检查所有门窗状态');
      suggestions.push('添加门窗开启延时提醒，防止忘记关门');
    }

    if (analysis.alerts.byCategory.find((c) => c.category === DetectionCategory.DeviceFault)?.count || 0 > 3) {
      suggestions.push('创建设备电池监控自动化，低电池时自动提醒更换');
      suggestions.push('添加设备离线检测和自动重试连接自动化');
    }

    if (analysis.alerts.byCategory.find((c) => c.category === DetectionCategory.EnergyAnomaly)?.count || 0 > 1) {
      suggestions.push('创建能耗监控仪表盘，实时追踪用电情况');
      suggestions.push('添加高峰时段用电提醒，优化用电时间');
    }

    if (analysis.alerts.byCategory.find((c) => c.category === DetectionCategory.AwayMode)?.count || 0 > 0) {
      suggestions.push('完善离家模式自动化，离家时自动关闭电器和布防');
      suggestions.push('添加离家模式摄像头自动开启功能');
    }

    if (analysis.alerts.resolutionRate < 0.7) {
      suggestions.push('配置告警自动处理流程，提高告警响应效率');
    }

    if (suggestions.length === 0) {
      suggestions.push('当前安全状态良好，建议定期review安防配置');
    }

    return suggestions;
  }

  private generateRecommendations(analysis: TrendAnalysisResult): string[] {
    const recommendations: string[] = [];

    if (analysis.securityScore.overall < 70) {
      recommendations.push('整体安全评分偏低，建议优先处理高风险项');
    }

    if (analysis.securityScore.weaknesses.length > 0) {
      recommendations.push(`待改进方面: ${analysis.securityScore.weaknesses.join(', ')}`);
    }

    for (const dim of analysis.securityScore.dimensions) {
      if (dim.score < 70) {
        recommendations.push(...dim.recommendations.slice(0, 2));
      }
    }

    recommendations.push('建议每月进行一次安全评估，跟踪改进进度');
    recommendations.push('定期检查和测试安防设备，确保正常工作');

    return [...new Set(recommendations)].slice(0, 10);
  }

  private generateTextReport(
    analysis: TrendAnalysisResult,
    period: ReportPeriod,
    summary: SecurityReport['summary'],
    topRisks: TopRiskItem[],
    deviceHealth: DeviceHealthSummary,
    recommendations: string[],
  ): string {
    const lines: string[] = [];
    const periodLabel = period === 'weekly' ? '周' : '月';

    lines.push('========================================');
    lines.push(`智能家居安全${periodLabel}报`);
    lines.push(`报告期间: ${this.formatDate(analysis.startDate)} 至 ${this.formatDate(analysis.endDate)}`);
    lines.push(`生成时间: ${this.formatDateTime(new Date())}`);
    lines.push('========================================');
    lines.push('');

    lines.push('一、本期概览');
    lines.push('------------------------------');
    lines.push(`安全评分: ${summary.securityScore}分 (${analysis.securityScore.grade}级)`);
    lines.push(`评分变化: ${summary.scoreChange >= 0 ? '+' : ''}${summary.scoreChange}分`);
    lines.push(`告警总数: ${summary.totalAlerts}`);
    lines.push(`已处理: ${summary.resolvedAlerts} (${(summary.resolutionRate * 100).toFixed(1)}%)`);
    lines.push(`严重告警: ${summary.criticalAlerts}`);
    lines.push(`高危告警: ${summary.highAlerts}`);
    lines.push('');

    lines.push('二、告警趋势');
    lines.push('------------------------------');
    lines.push('按类别分布:');
    for (const cat of analysis.alerts.byCategory) {
      lines.push(`  ${this.categoryLabel(cat.category)}: ${cat.count} (${cat.percentage.toFixed(1)}%)`);
    }
    lines.push('');
    lines.push('按严重级别分布:');
    for (const sev of analysis.alerts.bySeverity) {
      lines.push(`  ${this.severityLabel(sev.severity)}: ${sev.count} (${sev.percentage.toFixed(1)}%)`);
    }
    lines.push('');
    lines.push(`告警处理率: ${(analysis.alerts.resolutionRate * 100).toFixed(1)}%`);
    if (analysis.alerts.averageResponseTimeMinutes) {
      lines.push(`平均响应时间: ${analysis.alerts.averageResponseTimeMinutes.toFixed(1)}分钟`);
    }
    lines.push('');

    lines.push('三、Top 安全隐患');
    lines.push('------------------------------');
    for (const risk of topRisks.slice(0, 5)) {
      lines.push(`${risk.rank}. ${risk.title}`);
      lines.push(`   严重级别: ${this.severityLabel(risk.severity)}`);
      lines.push(`   发生次数: ${risk.occurrenceCount}`);
      lines.push(`   建议: ${risk.recommendation}`);
      lines.push('');
    }
    lines.push('');

    lines.push('四、设备健康状况');
    lines.push('------------------------------');
    lines.push(`设备总数: ${deviceHealth.totalDevices}`);
    lines.push(`健康评分: ${deviceHealth.healthScore}分`);
    lines.push(`在线率: ${(deviceHealth.onlineRate * 100).toFixed(1)}%`);
    lines.push(`健康设备: ${deviceHealth.healthyDevices}`);
    lines.push(`警告设备: ${deviceHealth.warningDevices}`);
    lines.push(`严重设备: ${deviceHealth.criticalDevices}`);
    if (deviceHealth.offlineDevices.length > 0) {
      lines.push(`离线设备: ${deviceHealth.offlineDevices.length}台`);
    }
    if (deviceHealth.lowBatteryDevices.length > 0) {
      lines.push(`低电池设备: ${deviceHealth.lowBatteryDevices.length}台`);
    }
    lines.push('');

    lines.push('五、安全评分详情');
    lines.push('------------------------------');
    for (const dim of analysis.securityScore.dimensions) {
      lines.push(`${dim.name}: ${dim.score}分 (权重: ${(dim.weight * 100).toFixed(0)}%)`);
    }
    lines.push('');
    if (analysis.securityScore.strengths.length > 0) {
      lines.push('优势:');
      for (const s of analysis.securityScore.strengths) {
        lines.push(`  + ${s}`);
      }
    }
    if (analysis.securityScore.weaknesses.length > 0) {
      lines.push('待改进:');
      for (const w of analysis.securityScore.weaknesses) {
        lines.push(`  - ${w}`);
      }
    }
    lines.push('');

    lines.push('六、改进建议');
    lines.push('------------------------------');
    for (let i = 0; i < recommendations.length; i++) {
      lines.push(`${i + 1}. ${recommendations[i]}`);
    }
    lines.push('');

    lines.push('========================================');
    lines.push(`报告由智能家居安全管家生成`);
    lines.push('========================================');

    return lines.join('\n');
  }

  private generateMarkdownReport(
    analysis: TrendAnalysisResult,
    period: ReportPeriod,
    summary: SecurityReport['summary'],
    topRisks: TopRiskItem[],
    deviceHealth: DeviceHealthSummary,
    recommendations: string[],
  ): string {
    const lines: string[] = [];
    const periodLabel = period === 'weekly' ? '周' : '月';

    lines.push(`# 智能家居安全${periodLabel}报`);
    lines.push('');
    lines.push(`> 报告期间: ${this.formatDate(analysis.startDate)} 至 ${this.formatDate(analysis.endDate)}`);
    lines.push(`>`);
    lines.push(`> 生成时间: ${this.formatDateTime(new Date())}`);
    lines.push('');

    lines.push('## 一、本期概览');
    lines.push('');
    lines.push('| 指标 | 数值 |');
    lines.push('|------|------|');
    lines.push(`| 安全评分 | **${summary.securityScore}分** (${analysis.securityScore.grade}级) |`);
    lines.push(`| 评分变化 | ${summary.scoreChange >= 0 ? '+' : ''}${summary.scoreChange}分 |`);
    lines.push(`| 告警总数 | ${summary.totalAlerts} |`);
    lines.push(`| 已处理 | ${summary.resolvedAlerts} (${(summary.resolutionRate * 100).toFixed(1)}%) |`);
    lines.push(`| 严重告警 | ${summary.criticalAlerts} |`);
    lines.push(`| 高危告警 | ${summary.highAlerts} |`);
    lines.push('');

    lines.push('## 二、告警趋势');
    lines.push('');
    lines.push('### 按类别分布');
    lines.push('');
    lines.push('| 类别 | 数量 | 占比 |');
    lines.push('|------|------|------|');
    for (const cat of analysis.alerts.byCategory) {
      lines.push(`| ${this.categoryLabel(cat.category)} | ${cat.count} | ${cat.percentage.toFixed(1)}% |`);
    }
    lines.push('');

    lines.push('### 按严重级别分布');
    lines.push('');
    lines.push('| 级别 | 数量 | 占比 |');
    lines.push('|------|------|------|');
    for (const sev of analysis.alerts.bySeverity) {
      lines.push(`| ${this.severityLabel(sev.severity)} | ${sev.count} | ${sev.percentage.toFixed(1)}% |`);
    }
    lines.push('');

    lines.push('### 处理效率');
    lines.push('');
    lines.push(`- 告警处理率: **${(analysis.alerts.resolutionRate * 100).toFixed(1)}%**`);
    if (analysis.alerts.averageResponseTimeMinutes) {
      lines.push(`- 平均响应时间: ${analysis.alerts.averageResponseTimeMinutes.toFixed(1)}分钟`);
    }
    lines.push('');

    lines.push('### 高频告警设备 Top 10');
    lines.push('');
    if (analysis.alerts.topDevices.length > 0) {
      lines.push('| 排名 | 设备 | 告警数 | 类别 |');
      lines.push('|------|------|--------|------|');
      analysis.alerts.topDevices.forEach((device, index) => {
        lines.push(`| ${index + 1} | ${device.entityId} | ${device.count} | ${this.categoryLabel(device.category)} |`);
      });
    } else {
      lines.push('暂无数据');
    }
    lines.push('');

    lines.push('## 三、Top 安全隐患');
    lines.push('');
    for (const risk of topRisks.slice(0, 5)) {
      lines.push(`### ${risk.rank}. ${risk.title}`);
      lines.push('');
      lines.push(`- **严重级别**: ${this.severityLabel(risk.severity)}`);
      lines.push(`- **发生次数**: ${risk.occurrenceCount}`);
      lines.push(`- **首次发生**: ${this.formatDateTime(risk.firstOccurredAt)}`);
      lines.push(`- **最近发生**: ${this.formatDateTime(risk.lastOccurredAt)}`);
      if (risk.affectedEntities.length > 0) {
        lines.push(`- **影响设备**: ${risk.affectedEntities.slice(0, 3).join(', ')}${risk.affectedEntities.length > 3 ? '...' : ''}`);
      }
      lines.push(`- **建议**: ${risk.recommendation}`);
      lines.push('');
    }
    lines.push('');

    lines.push('## 四、设备健康状况');
    lines.push('');
    lines.push('| 指标 | 数值 |');
    lines.push('|------|------|');
    lines.push(`| 设备总数 | ${deviceHealth.totalDevices} |`);
    lines.push(`| 健康评分 | **${deviceHealth.healthScore}分** |`);
    lines.push(`| 在线率 | ${(deviceHealth.onlineRate * 100).toFixed(1)}% |`);
    lines.push(`| 健康设备 | ${deviceHealth.healthyDevices} |`);
    lines.push(`| 警告设备 | ${deviceHealth.warningDevices} |`);
    lines.push(`| 严重设备 | ${deviceHealth.criticalDevices} |`);
    lines.push('');

    if (deviceHealth.offlineDevices.length > 0) {
      lines.push(`### 离线设备 (${deviceHealth.offlineDevices.length})`);
      lines.push('');
      lines.push(deviceHealth.offlineDevices.slice(0, 10).map((d) => `- ${d}`).join('\n'));
      if (deviceHealth.offlineDevices.length > 10) {
        lines.push(`... 还有 ${deviceHealth.offlineDevices.length - 10} 台`);
      }
      lines.push('');
    }

    if (deviceHealth.lowBatteryDevices.length > 0) {
      lines.push(`### 低电池设备 (${deviceHealth.lowBatteryDevices.length})`);
      lines.push('');
      lines.push(deviceHealth.lowBatteryDevices.slice(0, 10).map((d) => `- ${d}`).join('\n'));
      if (deviceHealth.lowBatteryDevices.length > 10) {
        lines.push(`... 还有 ${deviceHealth.lowBatteryDevices.length - 10} 台`);
      }
      lines.push('');
    }
    lines.push('');

    lines.push('## 五、安全评分详情');
    lines.push('');
    lines.push('| 维度 | 得分 | 权重 | 说明 |');
    lines.push('|------|------|------|------|');
    for (const dim of analysis.securityScore.dimensions) {
      lines.push(`| ${dim.name} | ${dim.score}分 | ${(dim.weight * 100).toFixed(0)}% | ${dim.description} |`);
    }
    lines.push('');

    if (analysis.securityScore.strengths.length > 0) {
      lines.push('### 优势');
      lines.push('');
      for (const s of analysis.securityScore.strengths) {
        lines.push(`- ${s}`);
      }
      lines.push('');
    }

    if (analysis.securityScore.weaknesses.length > 0) {
      lines.push('### 待改进');
      lines.push('');
      for (const w of analysis.securityScore.weaknesses) {
        lines.push(`- ${w}`);
      }
      lines.push('');
    }
    lines.push('');

    lines.push('## 六、改进建议');
    lines.push('');
    for (let i = 0; i < recommendations.length; i++) {
      lines.push(`${i + 1}. ${recommendations[i]}`);
    }
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push(`*报告由智能家居安全管家生成 v0.1.0*`);

    return lines.join('\n');
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatDateTime(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
  }

  private severityLabel(severity: SeverityLevel): string {
    switch (severity) {
      case SeverityLevel.Critical:
        return '严重';
      case SeverityLevel.High:
        return '高危';
      case SeverityLevel.Medium:
        return '中等';
      case SeverityLevel.Low:
        return '低';
      case SeverityLevel.Info:
        return '信息';
      default:
        return '未知';
    }
  }

  private categoryLabel(category: DetectionCategory): string {
    switch (category) {
      case DetectionCategory.AwayMode:
        return '离家模式';
      case DetectionCategory.DeviceFault:
        return '设备故障';
      case DetectionCategory.EnergyAnomaly:
        return '能耗异常';
      case DetectionCategory.DoorAccess:
        return '门禁访问';
      case DetectionCategory.Environmental:
        return '环境安全';
      case DetectionCategory.SecuritySystem:
        return '安防系统';
      default:
        return '未知';
    }
  }
}

export default ReportGenerator;
