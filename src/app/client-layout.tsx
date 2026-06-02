'use client';

import { useEffect, useState } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, Grid, Layout, Menu, notification } from "antd";
import {
  RadarChartOutlined,
  TeamOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  UserOutlined,
  MessageOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DemoMode from "./demo-mode";
import { DemoGuide } from "@/components/demo-guide";

const { Sider, Content, Header } = Layout;
const { useBreakpoint } = Grid;

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  // Real-time alert notifications via SSE
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const evtSource = new EventSource('/api/alerts/stream');
    evtSource.addEventListener('alerts', (e) => {
      try {
        const data = JSON.parse(e.data);
        const first = data.alerts?.[0];
        if (!first) return;
        notification.warning({
          message: `⚠️ 新的风险预警（${data.count}条）`,
          description: `${first.internName}（${first.position}）— ${first.type} · 等级：${first.level}`,
          placement: 'topRight',
          duration: 8,
          onClick: () => {
            window.location.href = '/alerts';
          },
        });
      } catch {
        // ignore
      }
    });
    return () => {
      evtSource.close();
    };
  }, []);

  const menuItems = [
    {
      key: "/",
      icon: <span className="nav-icon"><RadarChartOutlined /></span>,
      label: <Link href="/">雷达总览</Link>,
    },
    {
      key: "/interns",
      icon: <span className="nav-icon"><TeamOutlined /></span>,
      label: <Link href="/interns">实习生列表</Link>,
    },
    {
      key: "/alerts",
      icon: <span className="nav-icon"><WarningOutlined /></span>,
      label: <Link href="/alerts">风险预警</Link>,
    },
    {
      key: "/suggestions",
      icon: <span className="nav-icon"><ThunderboltOutlined /></span>,
      label: <Link href="/suggestions">AI建议</Link>,
    },
    {
      key: "/potentials",
      icon: <span className="nav-icon"><TrophyOutlined /></span>,
      label: <Link href="/potentials">高潜人才</Link>,
    },
    {
      key: "/assistant",
      icon: <span className="nav-icon"><MessageOutlined /></span>,
      label: <Link href="/assistant">AI 助手</Link>,
    },
    {
      key: "/reports",
      icon: <span className="nav-icon"><FileTextOutlined /></span>,
      label: <Link href="/reports">报告中心</Link>,
    },
    {
      type: 'divider' as const,
    },
    {
      key: "/my",
      icon: <span className="nav-icon"><UserOutlined /></span>,
      label: <Link href="/my">我的成长</Link>,
    },
  ];

  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#cc785c",
            colorSuccess: "#5db872",
            colorWarning: "#d4a017",
            colorError: "#c64545",
            colorInfo: "#cc785c",
            colorBgLayout: "#faf9f5",
            colorBgContainer: "#fffdfa",
            colorBgElevated: "#fffdfa",
            colorText: "#141413",
            colorTextSecondary: "#6c6a64",
            colorTextTertiary: "#8e8b82",
            colorTextQuaternary: "#b7b0a7",
            colorBorder: "#e6dfd8",
            colorBorderSecondary: "#ebe6df",
            borderRadius: 8,
            borderRadiusLG: 12,
            borderRadiusSM: 6,
            fontFamily: "var(--font-geist-sans), -apple-system, 'Segoe UI', Arial, sans-serif",
          },
          components: {
            Card: {
              colorBgContainer: "#fffdfa",
            },
            Menu: {
              itemBg: "transparent",
              itemSelectedBg: "#181715",
              itemSelectedColor: "#faf9f5",
              itemColor: "#3d3d3a",
              itemHoverColor: "#141413",
              itemHoverBg: "#f5f0e8",
            },
            Table: {
              colorBgContainer: "#fffdfa",
              headerBg: "#f5f0e8",
              headerColor: "#6c6a64",
              borderColor: "#e6dfd8",
              rowHoverBg: "#fbf4ed",
            },
            Progress: {
              remainingColor: "#ebe6df",
            },
          },
        }}
      >
        <App>
        <Layout style={{ minHeight: "100vh" }}>
          {!isMobile && (
            <Sider
              breakpoint="lg"
              collapsedWidth="80"
              collapsible
              collapsed={collapsed}
              onCollapse={setCollapsed}
              style={{
                overflow: "auto",
                height: "100vh",
                position: "fixed",
                left: 0,
                top: 0,
                bottom: 0,
                background: "var(--canvas)",
                borderRight: "1px solid var(--hairline)",
              }}
            >
              <div
                style={{
                  height: 76,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: 10,
                  padding: collapsed ? "0 16px" : "0 20px",
                  borderBottom: "1px solid var(--hairline)",
                }}
              >
                <img src="/tencent-logo-30.png" alt="" className="app-brand-mark" aria-hidden="true" />
                <h1
                  style={{
                    color: "var(--ink)",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: 18,
                    fontWeight: 400,
                    margin: 0,
                    letterSpacing: 0,
                    display: collapsed ? "none" : "block",
                  }}
                >
                  鹅苗雷达
                </h1>
              </div>
              <Menu
                theme="light"
                mode="inline"
                selectedKeys={[pathname]}
                items={menuItems}
                style={{
                  background: "transparent",
                  borderRight: "none",
                }}
              />
            </Sider>
          )}
          <Layout style={{ marginLeft: isMobile ? 0 : collapsed ? 80 : 200, transition: "margin-left 0.2s" }}>
            <Header
              style={{
                padding: isMobile ? "0 14px" : "0 24px",
                background: "rgba(250, 249, 245, 0.86)",
                backdropFilter: "blur(16px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(230, 223, 216, 0.78)",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                {isMobile && (
                  <img src="/tencent-logo-30.png" alt="" className="app-brand-mark mobile" aria-hidden="true" />
                )}
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                AI 实习生适岗识别与成长干预系统
                </div>
              </div>
              <div style={{ color: "var(--muted-soft)", fontSize: 13, display: isMobile ? "none" : "block" }}>
                2026年春季实习批次
              </div>
            </Header>
            <Content style={{ margin: isMobile ? 12 : 24, minHeight: 280, paddingBottom: isMobile ? 80 : 0 }}>
              <div className="demo-banner" style={{
                background: 'linear-gradient(90deg, #cc785c 0%, #d4a017 100%)',
                color: '#fff',
                textAlign: 'center',
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 8,
                marginBottom: 16,
                letterSpacing: 0.5,
              }}>
                🧪 本系统为 AI 实习生管理 Demo，数据均为模拟生成，不代表真实人员信息
              </div>
              <div className="app-shell-content">
                {children}
              </div>
            </Content>
            {isMobile && (
              <nav className="mobile-tabbar" aria-label="主要导航">
                {menuItems.filter(item => !item.type).map((item) => {
                  const selected = pathname === item.key || (item.key !== "/" && pathname.startsWith(String(item.key)));
                  return (
                    <Link
                      key={item.key}
                      href={String(item.key)}
                      className={selected ? "mobile-tabbar-item active" : "mobile-tabbar-item"}
                    >
                      {item.icon}
                      <span>{String(item.key) === "/" ? "总览" : String(item.key) === "/interns" ? "实习生" : String(item.key) === "/alerts" ? "预警" : String(item.key) === "/suggestions" ? "建议" : String(item.key) === "/assistant" ? "助手" : String(item.key) === "/my" ? "我的" : "高潜"}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
            <DemoMode />
            <DemoGuide />
          </Layout>
        </Layout>
        </App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
