import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 清空数据
  await prisma.scoreHistory.deleteMany();
  await prisma.riskAlert.deleteMany();
  await prisma.abilityScore.deleteMany();
  await prisma.task.deleteMany();
  await prisma.mentorFeedback.deleteMany();
  await prisma.weeklyReport.deleteMany();
  await prisma.intern.deleteMany();
  await prisma.mentor.deleteMany();
  await prisma.position.deleteMany();

  // 创建岗位
  const positions = await Promise.all([
    prisma.position.create({
      data: {
        name: '研发实习生',
        abilities: ['编程基础', '问题定位', '代码规范', '学习能力', '协作沟通', '工程意识'],
        weights: [0.25, 0.20, 0.15, 0.15, 0.15, 0.10],
      },
    }),
    prisma.position.create({
      data: {
        name: '产品实习生',
        abilities: ['用户理解', '逻辑分析', '需求表达', '数据意识', '沟通推进', '业务敏感度'],
        weights: [0.20, 0.20, 0.20, 0.15, 0.15, 0.10],
      },
    }),
    prisma.position.create({
      data: {
        name: '销售实习生',
        abilities: ['客户理解', '表达能力', '产品理解', '抗压能力', '跟进意识', '目标感'],
        weights: [0.20, 0.20, 0.15, 0.15, 0.15, 0.15],
      },
    }),
  ]);

  // 创建导师
  const mentors = await Promise.all([
    prisma.mentor.create({ data: { name: '张伟', department: '技术部' } }),
    prisma.mentor.create({ data: { name: '李娜', department: '产品部' } }),
    prisma.mentor.create({ data: { name: '王强', department: '销售部' } }),
    prisma.mentor.create({ data: { name: '陈静', department: '技术部' } }),
    prisma.mentor.create({ data: { name: '刘洋', department: '产品部' } }),
  ]);

  // 实习生数据
  const internsData = [
    // 研发岗 (8人)
    { name: '张晨', gender: '男', school: '浙江大学', major: '计算机科学', positionId: positions[0].id, mentorId: mentors[0].id, fitScore: 45, riskScore: 82, potentialScore: 35, tags: ['任务延期', '基础薄弱'], riskLevel: '高', potentialType: '', taskCompletionRate: 55, phase: '入门期' },
    { name: '王浩然', gender: '男', school: '华中科技大学', major: '软件工程', positionId: positions[0].id, mentorId: mentors[0].id, fitScore: 88, riskScore: 15, potentialScore: 92, tags: ['学习速度快', '代码质量高', '转正潜力高'], riskLevel: '低', potentialType: '快速成长型', taskCompletionRate: 96, phase: '产出期' },
    { name: '刘子涵', gender: '女', school: '北京邮电大学', major: '信息安全', positionId: positions[0].id, mentorId: mentors[3].id, fitScore: 72, riskScore: 38, potentialScore: 68, tags: ['协作待提升', '技术扎实'], riskLevel: '中', potentialType: '', taskCompletionRate: 78, phase: '适应期' },
    { name: '陈思远', gender: '男', school: '上海交通大学', major: '人工智能', positionId: positions[0].id, mentorId: mentors[3].id, fitScore: 85, riskScore: 20, potentialScore: 88, tags: ['主动性强', '学习速度快', '转正潜力高'], riskLevel: '低', potentialType: '主动探索型', taskCompletionRate: 92, phase: '产出期' },
    { name: '赵雨萱', gender: '女', school: '电子科技大学', major: '计算机科学', positionId: positions[0].id, mentorId: mentors[0].id, fitScore: 62, riskScore: 55, potentialScore: 50, tags: ['情绪波动', '任务延期'], riskLevel: '中', potentialType: '', taskCompletionRate: 65, phase: '适应期' },
    { name: '孙明哲', gender: '男', school: '哈尔滨工业大学', major: '软件工程', positionId: positions[0].id, mentorId: mentors[3].id, fitScore: 78, riskScore: 25, potentialScore: 75, tags: ['代码规范', '工程意识强'], riskLevel: '低', potentialType: '高质量交付型', taskCompletionRate: 88, phase: '适应期' },
    { name: '周雨桐', gender: '女', school: '武汉大学', major: '计算机科学', positionId: positions[0].id, mentorId: mentors[0].id, fitScore: 55, riskScore: 68, potentialScore: 42, tags: ['反馈偏少', '进度慢'], riskLevel: '高', potentialType: '', taskCompletionRate: 50, phase: '入门期' },
    { name: '吴子轩', gender: '男', school: '西安交通大学', major: '软件工程', positionId: positions[0].id, mentorId: mentors[3].id, fitScore: 80, riskScore: 22, potentialScore: 82, tags: ['学习能力强', '主动复盘'], riskLevel: '低', potentialType: '快速成长型', taskCompletionRate: 90, phase: '产出期' },

    // 产品岗 (7人)
    { name: '李安然', gender: '女', school: '复旦大学', major: '工商管理', positionId: positions[1].id, mentorId: mentors[1].id, fitScore: 90, riskScore: 12, potentialScore: 95, tags: ['产品sense强', '主动性强', '转正潜力高'], riskLevel: '低', potentialType: '业务敏感型', taskCompletionRate: 98, phase: '产出期' },
    { name: '王若曦', gender: '女', school: '南京大学', major: '市场营销', positionId: positions[1].id, mentorId: mentors[1].id, fitScore: 58, riskScore: 72, potentialScore: 45, tags: ['有点迷茫', '任务延期'], riskLevel: '高', potentialType: '', taskCompletionRate: 52, phase: '入门期' },
    { name: '郑子涵', gender: '男', school: '同济大学', major: '设计学', positionId: positions[1].id, mentorId: mentors[4].id, fitScore: 76, riskScore: 30, potentialScore: 72, tags: ['用户洞察强', '逻辑待提升'], riskLevel: '低', potentialType: '', taskCompletionRate: 82, phase: '适应期' },
    { name: '林思琪', gender: '女', school: '中山大学', major: '心理学', positionId: positions[1].id, mentorId: mentors[1].id, fitScore: 82, riskScore: 18, potentialScore: 85, tags: ['用户理解深', '表达清晰', '转正潜力高'], riskLevel: '低', potentialType: '高质量交付型', taskCompletionRate: 94, phase: '产出期' },
    { name: '黄子豪', gender: '男', school: '厦门大学', major: '经济学', positionId: positions[1].id, mentorId: mentors[4].id, fitScore: 68, riskScore: 42, potentialScore: 60, tags: ['数据意识一般', '主动性强'], riskLevel: '中', potentialType: '', taskCompletionRate: 72, phase: '适应期' },
    { name: '杨雨欣', gender: '女', school: '天津大学', major: '工业设计', positionId: positions[1].id, mentorId: mentors[1].id, fitScore: 75, riskScore: 28, potentialScore: 78, tags: ['需求表达好', '协作能力强'], riskLevel: '低', potentialType: '协作推进型', taskCompletionRate: 86, phase: '适应期' },
    { name: '徐子涵', gender: '男', school: '东南大学', major: '信息管理', positionId: positions[1].id, mentorId: mentors[4].id, fitScore: 60, riskScore: 58, potentialScore: 52, tags: ['反馈偏少', '进度慢'], riskLevel: '中', potentialType: '', taskCompletionRate: 62, phase: '入门期' },

    // 销售岗 (5人) - 平均适岗度约61，低于研发岗约10分
    { name: '马子轩', gender: '男', school: '对外经济贸易大学', major: '国际贸易', positionId: positions[2].id, mentorId: mentors[2].id, fitScore: 75, riskScore: 28, potentialScore: 78, tags: ['表达能力强', '目标感强', '转正潜力高'], riskLevel: '低', potentialType: '快速成长型', taskCompletionRate: 85, phase: '产出期' },
    { name: '何雨桐', gender: '女', school: '上海财经大学', major: '市场营销', positionId: positions[2].id, mentorId: mentors[2].id, fitScore: 55, riskScore: 58, potentialScore: 48, tags: ['抗压待提升', '客户理解一般'], riskLevel: '中', potentialType: '', taskCompletionRate: 58, phase: '适应期' },
    { name: '罗子涵', gender: '男', school: '西南财经大学', major: '工商管理', positionId: positions[2].id, mentorId: mentors[2].id, fitScore: 68, riskScore: 35, potentialScore: 70, tags: ['跟进意识强', '客户反馈好'], riskLevel: '低', potentialType: '主动探索型', taskCompletionRate: 78, phase: '产出期' },
    { name: '梁雨萱', gender: '女', school: '中南财经政法大学', major: '市场营销', positionId: positions[2].id, mentorId: mentors[2].id, fitScore: 45, riskScore: 80, potentialScore: 32, tags: ['情绪波动', '跟进不及时'], riskLevel: '高', potentialType: '', taskCompletionRate: 40, phase: '入门期' },
    { name: '宋子轩', gender: '男', school: '首都经济贸易大学', major: '国际商务', positionId: positions[2].id, mentorId: mentors[2].id, fitScore: 62, riskScore: 42, potentialScore: 60, tags: ['目标感强', '产品理解待提升'], riskLevel: '低', potentialType: '', taskCompletionRate: 70, phase: '适应期' },
  ];

  // 创建实习生
  const interns = [];
  for (const data of internsData) {
    const intern = await prisma.intern.create({
      data: {
        ...data,
        tags: data.tags,
        entryDate: new Date(Date.now() - Math.floor(Math.random() * 60 + 10) * 24 * 60 * 60 * 1000),
      },
    });
    interns.push(intern);
  }

  // 为每个实习生创建历史数据
  const now = new Date();
  for (const intern of interns) {
    // 最近4周的评分历史
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);

      const baseFit = intern.fitScore;
      const baseRisk = intern.riskScore;
      const basePotential = intern.potentialScore;

      await prisma.scoreHistory.create({
        data: {
          internId: intern.id,
          weekStart,
          fitScore: Math.max(0, Math.min(100, baseFit + Math.floor((Math.random() - 0.5) * 10 * (4 - i) / 4))),
          riskScore: Math.max(0, Math.min(100, baseRisk + Math.floor((Math.random() - 0.5) * 10 * (4 - i) / 4))),
          potentialScore: Math.max(0, Math.min(100, basePotential + Math.floor((Math.random() - 0.5) * 8 * (4 - i) / 4))),
          taskCompletionRate: Math.max(0, Math.min(100, intern.taskCompletionRate + Math.floor((Math.random() - 0.5) * 15 * (4 - i) / 4))),
        },
      });
    }

    // 能力评分
    const pos = positions.find(p => p.id === intern.positionId)!;
    const abilities = (pos.abilities ?? []) as unknown as string[];
    for (const ability of abilities) {
      await prisma.abilityScore.create({
        data: {
          internId: intern.id,
          dimension: ability,
          score: Math.max(30, Math.min(100, intern.fitScore + Math.floor((Math.random() - 0.5) * 30))),
          weekStart: now,
        },
      });
    }

    // 周报（最近2周）- 根据岗位和风险等级生成更真实的内容
    const reportTemplates: Record<string, Record<string, string[]>> = {
      '研发实习生': {
        high: [
          '本周主要负责用户模块的接口开发，但对项目架构理解不够深入，导致返工了两次。代码review中导师指出了3处逻辑错误，感觉有点跟不上节奏。周报写到一半不知道该怎么总结，先这样吧。',
          '这周任务是修复3个Bug，但只完成了1个。另外2个涉及到不熟悉的模块，查了很久文档还是没头绪。有点焦虑，怕拖累团队进度。',
        ],
        medium: [
          '本周完成了订单模块的单元测试编写，覆盖率达到85%。过程中遇到一些Mock的使用问题，通过查阅文档和请教同事解决了。整体进度正常，但感觉对业务理解还不够深入。',
          '参与了技术方案评审，学习了微服务架构的设计思路。自己负责的小功能开发进度正常，但代码规范方面还需要加强。',
        ],
        low: [
          '本周独立完成了商品详情页的性能优化，页面加载速度提升40%。过程中深入学习了React.memo和useMemo的使用，对性能优化有了更系统的理解。主动复盘了本周的工作方法，整理成文档分享给了团队。',
          '完成了支付模块的重构，代码量减少30%且可读性更好。主动参与了Code Review，从同事的反馈中学到了很多工程实践。下周计划挑战一下核心交易流程的开发。',
        ],
      },
      '产品实习生': {
        high: [
          '本周负责竞品分析报告，但对分析框架不太确定，写了删删了写。周报提到"有点迷茫"，不知道怎么把竞品信息转化成产品建议。导师让我重写一次，有点受挫。',
          '参加了用户访谈，但笔记记得不够系统，回来整理时发现漏了很多关键信息。感觉自己对用户需求的把握还不够准确。',
        ],
        medium: [
          '本周完成了竞品分析报告和用户访谈整理，产出质量中等。对数据口径还不太确定，需要进一步学习。整体表达积极，主动寻求反馈。',
          '参与了需求评审会，学习了PRD的撰写规范。遇到的主要困难是对业务背景不够熟悉，导致部分需求理解有偏差。正在积极调整学习方法。',
        ],
        low: [
          '本周独立完成了v2.3版本的需求文档，获得导师高度评价。主动复盘了上周的不足，这周在数据分析方面有明显提升。用户访谈中发现了3个关键痛点，已转化为具体需求。',
          '完成了竞品分析和用户调研，产出的PRD结构清晰、逻辑严谨。主动参与了产品评审会，提出的2个建议被采纳。对产品的理解正在快速提升。',
        ],
      },
      '销售实习生': {
        high: [
          '本周跟导师拜访了2个客户，但自己不太敢开口。产品功能介绍时卡壳了，客户问的问题答不上来。回来后心情不太好，感觉不太适合做销售。',
          '整理了10个客户线索，但跟进时发现很多信息不准确。打电话时紧张，话术还不熟练。感觉压力有点大。',
        ],
        medium: [
          '本周跟随导师拜访了3个客户，学习了客户沟通技巧。对产品功能的理解还不够深入，需要加强产品知识学习。整体表现积极。',
          '完成了客户资料整理和初步跟进，约到了2个意向客户。沟通技巧有提升，但产品知识还需要加强。',
        ],
        low: [
          '本周独立完成了5个客户的拜访，成功签约2个。客户反馈沟通体验好，产品介绍逻辑清晰。主动学习了竞品知识，能更好地应对客户疑问。',
          '完成了10个客户的深度跟进，转化率达到30%。客户异议处理能力明显提升，获得了导师和客户的认可。',
        ],
      },
    };

    for (let i = 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);

      const positionName = positions.find(p => p.id === intern.positionId)?.name || '研发实习生';
      const riskLevel = intern.riskLevel === '高' ? 'high' : intern.riskLevel === '中' ? 'medium' : 'low';
      const templates = reportTemplates[positionName]?.[riskLevel] || reportTemplates['研发实习生'][riskLevel];
      const content = templates[Math.floor(Math.random() * templates.length)];

      await prisma.weeklyReport.create({
        data: {
          internId: intern.id,
          weekStart,
          content,
          wordCount: content.length,
          aiSummary: intern.riskLevel === '高'
            ? `本周工作遇到困难，${positionName === '销售实习生' ? '客户沟通' : '任务完成'}方面存在压力，情绪有波动，建议关注。`
            : intern.riskLevel === '中'
            ? `本周工作基本完成，但在${positionName === '研发实习生' ? '技术深度' : positionName === '产品实习生' ? '业务理解' : '产品知识'}方面仍需提升。`
            : `本周表现优秀，${positionName === '研发实习生' ? '独立完成技术挑战' : positionName === '产品实习生' ? '产出质量高且主动复盘' : '客户转化率高'}，成长明显。`,
          emotionSignal: intern.riskLevel === '高' ? '消极' : intern.riskLevel === '中' ? '中性' : '积极',
          difficulties: intern.riskLevel === '高' ? (positionName === '销售实习生' ? '产品知识不足，客户沟通紧张' : '业务背景不熟悉，任务完成有困难') : '',
          needsHelp: intern.riskLevel === '高',
        },
      });
    }

    // 导师反馈（最近2周）- 根据风险等级生成更真实的反馈
    const feedbackTemplates: Record<string, { performance: number; comment: string; strengths: string; concerns: string; needsHR: boolean }[]> = {
      high: [
        { performance: 2, comment: '连续两周任务延期，周报中出现"焦虑""迷茫"等表达。基础掌握较慢，需要反复指导。建议安排一次1v1沟通，了解具体困难。', strengths: '态度端正，愿意学习', concerns: '任务延期、情绪波动、基础薄弱', needsHR: true },
        { performance: 2, comment: '本周任务完成率下降明显，代码review中发现多处基础问题。周报字数明显减少，表达消极。需要关注其心理状态。', strengths: '', concerns: '任务延期、情绪消极、需要HR介入', needsHR: true },
      ],
      medium: [
        { performance: 3, comment: '整体表现中等，任务基本完成但质量有待提升。对业务理解还不够深入，需要更多时间沉淀。建议增加1v1频率。', strengths: '态度端正、学习主动', concerns: '业务理解需加强、产出质量不稳定', needsHR: false },
        { performance: 3, comment: '本周表现平稳，完成了基础任务。但在团队协作方面还需加强，会议中较少主动发言。建议安排一次小组汇报锻炼。', strengths: '任务完成及时', concerns: '协作表达需提升', needsHR: false },
      ],
      low: [
        { performance: 5, comment: '本周表现优秀，独立完成了有挑战性的任务。学习主动性很强，能举一反三。代码/文档质量持续提升，建议加入重点培养名单。', strengths: '学习速度快、主动复盘、产出质量高', concerns: '', needsHR: false },
        { performance: 4, comment: '整体表现不错，任务完成质量较高。主动参与团队讨论，提出有价值的建议。建议安排更具挑战性的任务。', strengths: '主动性强、协作能力好', concerns: '', needsHR: false },
      ],
    };

    for (let i = 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);

      const riskLevel = intern.riskLevel === '高' ? 'high' : intern.riskLevel === '中' ? 'medium' : 'low';
      const feedbackOptions = feedbackTemplates[riskLevel];
      const feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];

      await prisma.mentorFeedback.create({
        data: {
          internId: intern.id,
          mentorId: intern.mentorId,
          weekStart,
          ...feedback,
        },
      });
    }

    // 任务（最近2周，每周3-4个）
    const taskTemplates: Record<string, string[]> = {
      '研发实习生': ['修复3个Bug', '完成代码Review', '输出技术文档', '参与技术方案讨论'],
      '产品实习生': ['完成竞品分析报告', '撰写需求文档', '参与需求评审会', '整理用户反馈'],
      '销售实习生': ['拜访2个客户', '整理客户资料', '模拟产品介绍', '输出客户异议清单'],
    };

    const positionName = positions.find(p => p.id === intern.positionId)?.name || '研发实习生';
    const tasks = taskTemplates[positionName] || taskTemplates['研发实习生'];

    for (let i = 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);

      for (const taskTitle of tasks) {
        const completed = Math.random() < (intern.taskCompletionRate / 100);
        await prisma.task.create({
          data: {
            internId: intern.id,
            title: taskTitle,
            weekStart,
            status: completed ? 'completed' : (i === 0 ? 'in_progress' : 'overdue'),
            completedAt: completed ? new Date(weekStart.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000) : null,
          },
        });
      }
    }

    // 风险预警（高风险和中风险的）
    if (intern.riskLevel === '高') {
      const riskTypes = ['低投入', '能力错配', '情绪压力', '留用'];
      const riskType = riskTypes[Math.floor(Math.random() * riskTypes.length)];

      await prisma.riskAlert.create({
        data: {
          internId: intern.id,
          type: riskType,
          level: '高',
          reason: [
            '连续两周核心任务延期',
            '周报中出现消极情绪表达',
            '导师反馈需要HR介入',
            '任务完成率低于60%',
          ],
          action: 'HR本周优先沟通，了解具体困难，制定改进计划',
        },
      });
    } else if (intern.riskLevel === '中') {
      await prisma.riskAlert.create({
        data: {
          internId: intern.id,
          type: '融入',
          level: '中',
          reason: [
            '协作记录较少',
            '主动反馈频率下降',
            '部分任务进度滞后',
          ],
          action: '导师增加1v1频率，安排团队buddy',
        },
      });
    }
  }

  console.log('Seed data created successfully!');
  console.log(`Created ${interns.length} interns`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
