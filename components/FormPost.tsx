"use client";

export default function FormPost({
  action,
  confirmar,
  className,
  children,
}: {
  action: string;
  confirmar?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      method="post"
      action={action}
      className={className}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
