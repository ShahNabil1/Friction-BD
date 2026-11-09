export function IntroBlock() {
  return (
    <section className="container py-10 md:py-14">
      <div className="grid gap-8 rounded-3xl border border-input bg-card p-7 shadow-soft md:grid-cols-12 md:p-10">
        <div className="md:col-span-5">
          <h2 className="text-2xl font-extrabold tracking-tight">Premium Footwear Store</h2>
          <p className="mt-3 text-muted-foreground">
            Friction curates authentic footwear from trusted brands — packed with care and
            delivered fast across Bangladesh.
          </p>
        </div>
        <div className="grid gap-4 md:col-span-7 md:grid-cols-3">
          <div className="rounded-2xl border border-input bg-background p-5 shadow-soft">
            <div className="text-sm font-semibold">100% Authentic</div>
            <div className="mt-1 text-sm text-muted-foreground">We verify every pair we sell.</div>
          </div>
          <div className="rounded-2xl border border-input bg-background p-5 shadow-soft">
            <div className="text-sm font-semibold">Cash on Delivery</div>
            <div className="mt-1 text-sm text-muted-foreground">Pay when you receive your order.</div>
          </div>
          <div className="rounded-2xl border border-input bg-background p-5 shadow-soft">
            <div className="text-sm font-semibold">Easy Returns</div>
            <div className="mt-1 text-sm text-muted-foreground">7-day hassle-free return policy.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
