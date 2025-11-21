import LoginForm from "./login/LoginForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">SwiftFlow</h1>
          <p className="text-gray-600">Manufacturing ERP System</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
