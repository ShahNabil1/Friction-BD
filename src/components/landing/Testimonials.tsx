import avatar1 from "@/assets/avatar-1.jpg";
import avatar2 from "@/assets/avatar-2.jpg";
import avatar3 from "@/assets/avatar-3.jpg";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Aanya Verma",
    quote:
      "The watch feels premium and the perfume lasted all day. Packaging was gorgeous — exactly what I wanted for gifting.",
    rating: 5,
    photo: avatar1,
  },
  {
    name: "Daniel Hart",
    quote:
      "Fast delivery and authentic products. The smart watch is sleek and the strap swap service is a great touch.",
    rating: 5,
    photo: avatar2,
  },
  {
    name: "Mina Sato",
    quote:
      "Beautiful selection of fragrances. The pocket perfume is perfect for travel and the quality is excellent.",
    rating: 5,
    photo: avatar3,
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={"h-4 w-4"}
          fill={i < count ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="container py-10 md:py-14" aria-label="Testimonials">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-extrabold tracking-tight">Lovely Testimonial from Happy Customer</h2>
        <a href="#" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          Read more
        </a>
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-3">
        {testimonials.map((t) => (
          <figure key={t.name} className="rounded-3xl border border-input bg-card p-7 shadow-soft transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-elegant">
            <div className="text-gold">
              <Stars count={t.rating} />
            </div>
            <blockquote className="mt-4 text-pretty text-muted-foreground">“{t.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <img
                src={t.photo}
                alt={`Photo of ${t.name}`}
                className="h-12 w-12 rounded-full border-2 border-gold object-cover"
                loading="lazy"
              />
              <div>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">Verified buyer</div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
