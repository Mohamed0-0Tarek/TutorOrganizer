import { Backdrop } from "@/components/ui/Backdrop";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <Backdrop />
      {children}
    </div>
  );
}
