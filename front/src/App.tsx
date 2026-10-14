import { Suspense, lazy, useEffect } from 'react';
import { initStatusBar } from '@/lib/capacitor';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '@/components/common/PageTransition';
import LoadingScreen from '@/components/feedback/LoadingScreen';
import ErrorBoundary from '@/components/feedback/ErrorBoundary';
import RouteGuard from '@/components/common/RouteGuard';
import BottomNav from '@/components/layout/BottomNav';

// 入口与认证
const Launch = lazy(() => import('@/pages/onboarding/Launch'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const UserAgreement = lazy(() => import('@/pages/auth/UserAgreement'));
const PrivacyPolicy = lazy(() => import('@/pages/auth/PrivacyPolicy'));
const JoinClass = lazy(() => import('@/pages/class/JoinClass'));
const Onboarding = lazy(() => import('@/pages/onboarding/Onboarding'));

// 首页
const StudentHome = lazy(() => import('@/pages/home/StudentHome'));
const ClassHome = lazy(() => import('@/pages/class/ClassHome'));

// 消息与任务
const Messages = lazy(() => import('@/pages/messages/Messages'));
const MessageList = lazy(() => import('@/pages/messages/MessageList'));
const MessageDetail = lazy(() => import('@/pages/messages/MessageDetail'));
const PublishMessage = lazy(() => import('@/pages/messages/PublishMessage'));
const MessageStats = lazy(() => import('@/pages/messages/MessageStats'));
const InteractionMessages = lazy(() => import('@/pages/messages/InteractionMessages'));
const TaskBoard = lazy(() => import('@/pages/tools/TaskBoard'));
const PublishTask = lazy(() => import('@/pages/tools/PublishTask'));

// 考勤
const AttendanceList = lazy(() => import('@/pages/attendances/AttendanceList'));
const PublishAttendance = lazy(() => import('@/pages/attendances/PublishAttendance'));
const AttendanceDetail = lazy(() => import('@/pages/attendances/AttendanceDetail'));
const CheckIn = lazy(() => import('@/pages/attendances/CheckIn'));
const CheckInDetail = lazy(() => import('@/pages/attendances/CheckInDetail'));
const CheckInMethod = lazy(() => import('@/pages/attendances/CheckInMethod'));
const LeaveApply = lazy(() => import('@/pages/attendances/LeaveApply'));
const LeaveApproval = lazy(() => import('@/pages/attendances/LeaveApproval'));
const AttendanceReport = lazy(() => import('@/pages/attendances/AttendanceReport'));
const MyAttendance = lazy(() => import('@/pages/attendances/MyAttendance'));

// 作业
const HomeworkList = lazy(() => import('@/pages/homeworks/HomeworkList'));
const PublishHomework = lazy(() => import('@/pages/homeworks/PublishHomework'));
const HomeworkDetail = lazy(() => import('@/pages/homeworks/HomeworkDetail'));
const HomeworkSubmit = lazy(() => import('@/pages/homeworks/HomeworkSubmit'));
const DelayApply = lazy(() => import('@/pages/homeworks/DelayApply'));
const MyHomework = lazy(() => import('@/pages/homeworks/MyHomework'));

// 活动与报名
const ActivityList = lazy(() => import('@/pages/activities/ActivityList'));
const PublishActivity = lazy(() => import('@/pages/activities/PublishActivity'));
const ActivityDetail = lazy(() => import('@/pages/activities/ActivityDetail'));
const RegistrationForm = lazy(() => import('@/pages/activities/RegistrationForm'));
const MyRegistration = lazy(() => import('@/pages/activities/MyRegistration'));
const RegistrationStats = lazy(() => import('@/pages/activities/RegistrationStats'));
const MyActivities = lazy(() => import('@/pages/activities/MyActivities'));

// 投票
const VoteList = lazy(() => import('@/pages/votes/VoteList'));
const PublishVote = lazy(() => import('@/pages/votes/PublishVote'));
const VoteOptions = lazy(() => import('@/pages/votes/VoteOptions'));

// 班费与团费
const FeeLedger = lazy(() => import('@/pages/finance/FeeLedger'));
const FeeRecord = lazy(() => import('@/pages/finance/FeeRecord'));
const FinanceReport = lazy(() => import('@/pages/finance/FinanceReport'));
const PaymentRegister = lazy(() => import('@/pages/finance/PaymentRegister'));
const LeagueFeeRecord = lazy(() => import('@/pages/finance/LeagueFeeRecord'));
const LeaguePaymentRegister = lazy(() => import('@/pages/finance/LeaguePaymentRegister'));

// 离线作业核对
const OfflineCheckHome = lazy(() => import('@/pages/homeworks/OfflineCheckHome'));
const BatchCheck = lazy(() => import('@/pages/homeworks/BatchCheck'));
const ScreenshotCheck = lazy(() => import('@/pages/homeworks/ScreenshotCheck'));
const CheckResult = lazy(() => import('@/pages/homeworks/CheckResult'));

// 资料与档案
const MaterialLibrary = lazy(() => import('@/pages/tools/MaterialLibrary'));
const UploadMaterial = lazy(() => import('@/pages/tools/UploadMaterial'));
const RepostMessage = lazy(() => import('@/pages/tools/RepostMessage'));
const MaterialDetail = lazy(() => import('@/pages/tools/MaterialDetail'));
const FileList = lazy(() => import('@/pages/archive/FileList'));
const DownloadStats = lazy(() => import('@/pages/archive/DownloadStats'));
const ClassArchive = lazy(() => import('@/pages/archive/ClassArchive'));
const ArchiveDetail = lazy(() => import('@/pages/archive/ArchiveDetail'));
const ClassElectronicArchive = lazy(() => import('@/pages/archive/ClassElectronicArchive'));
const ExportArchive = lazy(() => import('@/pages/archive/ExportArchive'));
const DataDashboard = lazy(() => import('@/pages/data/DataDashboard'));
const SemesterReport = lazy(() => import('@/pages/archive/SemesterReport'));

// 成员与班委
const MemberList = lazy(() => import('@/pages/class/MemberList'));
const MemberDetail = lazy(() => import('@/pages/class/MemberDetail'));
const ImportStudents = lazy(() => import('@/pages/class/ImportStudents'));
const ClassSettings = lazy(() => import('@/pages/class/ClassSettings'));

// 工具
const Pomodoro = lazy(() => import('@/pages/tools/Pomodoro'));
const RandomDraw = lazy(() => import('@/pages/tools/RandomDraw'));
const DrawRules = lazy(() => import('@/pages/tools/DrawRules'));
const DrawRecords = lazy(() => import('@/pages/tools/DrawRecords'));
const DrawRecordDetail = lazy(() => import('@/pages/tools/DrawRecordDetail'));
const MoreFeatures = lazy(() => import('@/pages/home/MoreFeatures'));
const ScanPage = lazy(() => import('@/pages/tools/ScanPage'));

// 个人中心
const PersonalCenter = lazy(() => import('@/pages/settings/PersonalCenter'));
const AccountSecurity = lazy(() => import('@/pages/settings/AccountSecurity'));
const NotificationSettings = lazy(() => import('@/pages/settings/NotificationSettings'));
const PrivacySettings = lazy(() => import('@/pages/settings/PrivacySettings'));
const GeneralSettings = lazy(() => import('@/pages/settings/GeneralSettings'));
const Settings = lazy(() => import('@/pages/settings/Settings'));
const ReminderSettings = lazy(() => import('@/pages/settings/ReminderSettings'));
const HelpFeedback = lazy(() => import('@/pages/settings/HelpFeedback'));
const About = lazy(() => import('@/pages/settings/About'));

// 管理后台
const ErrorDashboard = lazy(() => import('@/pages/admin/ErrorDashboard'));

// 404
const NotFound = lazy(() => import('@/pages/common/NotFound'));

function AuthRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <PageTransition>{children}</PageTransition>
    </RouteGuard>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* 入口与认证 */}
        <Route path="/" element={<PageTransition><Launch /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/user-agreement" element={<PageTransition><UserAgreement /></PageTransition>} />
        <Route path="/privacy-policy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
        <Route path="/join-class" element={<PageTransition><JoinClass /></PageTransition>} />
        <Route path="/onboarding" element={<PageTransition><Onboarding /></PageTransition>} />

        {/* 首页 */}
        <Route path="/home" element={<PageTransition><StudentHome /></PageTransition>} />
        <Route path="/class-home" element={<PageTransition><ClassHome /></PageTransition>} />

        {/* 消息与任务 */}
        <Route path="/messages" element={<PageTransition><Messages /></PageTransition>} />
        <Route path="/message-list" element={<PageTransition><MessageList /></PageTransition>} />
        <Route path="/message-detail/:messageId" element={<PageTransition><MessageDetail /></PageTransition>} />
        <Route path="/publish-message" element={<AuthRoute><PublishMessage /></AuthRoute>} />
        <Route path="/message-stats" element={<AuthRoute><MessageStats /></AuthRoute>} />
        <Route path="/message-stats/:messageId" element={<AuthRoute><MessageStats /></AuthRoute>} />
        <Route path="/interaction-messages" element={<PageTransition><InteractionMessages /></PageTransition>} />
        <Route path="/task-board" element={<PageTransition><TaskBoard /></PageTransition>} />
        <Route path="/publish-task" element={<AuthRoute><PublishTask /></AuthRoute>} />

        {/* 考勤 */}
        <Route path="/attendance-list" element={<PageTransition><AttendanceList /></PageTransition>} />
        <Route path="/publish-attendance" element={<AuthRoute><PublishAttendance /></AuthRoute>} />
        <Route path="/attendance-detail/:classId/:attendanceId" element={<PageTransition><AttendanceDetail /></PageTransition>} />
        <Route path="/check-in" element={<PageTransition><CheckIn /></PageTransition>} />
        <Route path="/check-in-detail/:classId/:attendanceId" element={<PageTransition><CheckInDetail /></PageTransition>} />
        <Route path="/check-in-method" element={<AuthRoute><CheckInMethod /></AuthRoute>} />
        <Route path="/leave-apply" element={<PageTransition><LeaveApply /></PageTransition>} />
        <Route path="/leave-approval" element={<PageTransition><LeaveApproval /></PageTransition>} />
        <Route path="/attendance-report" element={<PageTransition><AttendanceReport /></PageTransition>} />
        <Route path="/my-attendance" element={<PageTransition><MyAttendance /></PageTransition>} />

        {/* 作业 */}
        <Route path="/homework-list" element={<PageTransition><HomeworkList /></PageTransition>} />
        <Route path="/publish-homework" element={<AuthRoute><PublishHomework /></AuthRoute>} />
        <Route path="/homework-detail/:id" element={<PageTransition><HomeworkDetail /></PageTransition>} />
        <Route path="/homework-submit" element={<AuthRoute><HomeworkSubmit /></AuthRoute>} />
        <Route path="/delay-apply" element={<AuthRoute><DelayApply /></AuthRoute>} />
        <Route path="/my-homework" element={<AuthRoute><MyHomework /></AuthRoute>} />

        {/* 活动与报名 */}
        <Route path="/activity-list" element={<PageTransition><ActivityList /></PageTransition>} />
        <Route path="/publish-activity" element={<AuthRoute><PublishActivity /></AuthRoute>} />
        <Route path="/activity-detail/:classId/:activityId" element={<PageTransition><ActivityDetail /></PageTransition>} />
        <Route path="/registration-form" element={<AuthRoute><RegistrationForm /></AuthRoute>} />
        <Route path="/my-registration" element={<AuthRoute><MyRegistration /></AuthRoute>} />
        <Route path="/registration-stats" element={<AuthRoute><RegistrationStats /></AuthRoute>} />
        <Route path="/my-activities" element={<PageTransition><MyActivities /></PageTransition>} />

        {/* 投票 */}
        <Route path="/vote-list" element={<PageTransition><VoteList /></PageTransition>} />
        <Route path="/publish-vote" element={<AuthRoute><PublishVote /></AuthRoute>} />
        <Route path="/vote-options" element={<PageTransition><VoteOptions /></PageTransition>} />

        {/* 班费与团费 */}
        <Route path="/fee-ledger" element={<AuthRoute><FeeLedger /></AuthRoute>} />
        <Route path="/fee-record" element={<AuthRoute><FeeRecord /></AuthRoute>} />
        <Route path="/finance-report" element={<PageTransition><FinanceReport /></PageTransition>} />
        <Route path="/payment-register" element={<AuthRoute><PaymentRegister /></AuthRoute>} />
        <Route path="/league-fee-record" element={<AuthRoute><LeagueFeeRecord /></AuthRoute>} />
        <Route path="/league-payment-register" element={<AuthRoute><LeaguePaymentRegister /></AuthRoute>} />

        {/* 离线作业核对 */}
        <Route path="/offline-check" element={<AuthRoute><OfflineCheckHome /></AuthRoute>} />
        <Route path="/batch-check" element={<AuthRoute><BatchCheck /></AuthRoute>} />
        <Route path="/screenshot-check" element={<AuthRoute><ScreenshotCheck /></AuthRoute>} />
        <Route path="/check-result" element={<AuthRoute><CheckResult /></AuthRoute>} />
        <Route path="/check-result/:homeworkId" element={<AuthRoute><CheckResult /></AuthRoute>} />

        {/* 资料与档案 */}
        <Route path="/material-library" element={<PageTransition><MaterialLibrary /></PageTransition>} />
        <Route path="/upload-material" element={<AuthRoute><UploadMaterial /></AuthRoute>} />
        <Route path="/repost-message" element={<AuthRoute><RepostMessage /></AuthRoute>} />
        <Route path="/material-detail" element={<PageTransition><MaterialDetail /></PageTransition>} />
        <Route path="/file-list" element={<PageTransition><FileList /></PageTransition>} />
        <Route path="/download-stats" element={<AuthRoute><DownloadStats /></AuthRoute>} />
        <Route path="/class-archive" element={<PageTransition><ClassArchive /></PageTransition>} />
        <Route path="/archive-detail" element={<PageTransition><ArchiveDetail /></PageTransition>} />
        <Route path="/class-electronic-archive" element={<PageTransition><ClassElectronicArchive /></PageTransition>} />
        <Route path="/export-archive" element={<AuthRoute><ExportArchive /></AuthRoute>} />
        <Route path="/data-dashboard" element={<PageTransition><DataDashboard /></PageTransition>} />
        <Route path="/semester-report" element={<PageTransition><SemesterReport /></PageTransition>} />

        {/* 成员与班委 */}
        <Route path="/member-list" element={<PageTransition><MemberList /></PageTransition>} />
        <Route path="/member-detail" element={<PageTransition><MemberDetail /></PageTransition>} />
        <Route path="/import-students" element={<AuthRoute><ImportStudents /></AuthRoute>} />
        <Route path="/class-settings" element={<AuthRoute><ClassSettings /></AuthRoute>} />

        {/* 工具 */}
        <Route path="/pomodoro" element={<PageTransition><Pomodoro /></PageTransition>} />
        <Route path="/random-draw" element={<PageTransition><RandomDraw /></PageTransition>} />
        <Route path="/draw-rules" element={<PageTransition><DrawRules /></PageTransition>} />
        <Route path="/draw-records" element={<PageTransition><DrawRecords /></PageTransition>} />
        <Route path="/draw-record/:drawId" element={<PageTransition><DrawRecordDetail /></PageTransition>} />
        <Route path="/scan" element={<PageTransition><ScanPage /></PageTransition>} />
        <Route path="/more-features" element={<PageTransition><MoreFeatures /></PageTransition>} />

        {/* 个人中心 */}
        <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
        <Route path="/personal-center" element={<PageTransition><PersonalCenter /></PageTransition>} />
        <Route path="/account-security" element={<PageTransition><AccountSecurity /></PageTransition>} />
        <Route path="/notification-settings" element={<PageTransition><NotificationSettings /></PageTransition>} />
        <Route path="/privacy-settings" element={<PageTransition><PrivacySettings /></PageTransition>} />
        <Route path="/general-settings" element={<PageTransition><GeneralSettings /></PageTransition>} />
        <Route path="/reminder-settings" element={<PageTransition><ReminderSettings /></PageTransition>} />
        <Route path="/help-feedback" element={<PageTransition><HelpFeedback /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />

        {/* 管理后台 */}
        <Route path="/error-dashboard" element={<AuthRoute><ErrorDashboard /></AuthRoute>} />

        {/* 404 兜底 */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function NavOverlay() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center sm:inset-y-0 sm:items-center sm:p-6">
      <div className="pointer-events-none flex w-full flex-col justify-end sm:h-phone sm:w-phone">
        <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // 在 App 挂载后再初始化，确保 Capacitor 的 AndroidBridge 已注入、能读到真实状态栏高度
    void initStatusBar();
  }, []);

  return (
    <Router>
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <AnimatedRoutes />
        </Suspense>
        <NavOverlay />
      </ErrorBoundary>
    </Router>
  );
}
