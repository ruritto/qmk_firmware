import LoginButton from "./LoginButton";

const ERROR_MESSAGES: Record<string, string> = {
  domain:
    "このアプリは学校の Google アカウントでのみ利用できます。学校のアカウントでログインし直してください。",
  auth: "ログインに失敗しました。もう一度お試しください。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const domain = process.env.NEXT_PUBLIC_ALLOWED_GOOGLE_DOMAIN;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f9f9f7] p-6 dark:bg-[#0d0d0d]">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#1a1a19]">
        <h1 className="text-xl font-bold">VR プロジェクト</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
          タスク・スケジュール共有アプリ
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.auth}
          </p>
        )}

        <div className="mt-8">
          <LoginButton />
        </div>

        {domain && (
          <p className="mt-4 text-center text-xs text-gray-400 dark:text-neutral-500">
            @{domain} のアカウントのみログインできます
          </p>
        )}
      </div>
    </main>
  );
}
