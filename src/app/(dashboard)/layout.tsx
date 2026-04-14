import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { CloserWidget } from '@/components/chat/CloserWidget'
import { ToastProvider } from '@/components/ui/ToastProvider'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <ToastProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar role={session.user.role} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar user={session.user} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
        <CloserWidget />
      </div>
    </ToastProvider>
  )
}
