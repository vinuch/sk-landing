import Link from "next/link";

type MenuItemCardProps = {
  item: {
    id: string | number;
    name: string;
    list_price: number;
  };
  href?: string;
  className?: string;
  pixelEvent?: string;
  enableHoverTilt?: boolean;
  disabled?: boolean;
  disabledLabel?: string;
};

export default function MenuItemCard({
  item,
  href,
  className = "",
  pixelEvent = "PageView",
  enableHoverTilt = true,
  disabled = false,
  disabledLabel = "Only available with soup",
}: MenuItemCardProps) {
  const handleMenuItemClick = () => {
    if (disabled) return;
    // @ts-expect-error: untyped external dependency
    if (window.fbq) {
      // @ts-expect-error: untyped external dependency
      window.fbq("track", pixelEvent);
      console.log(`${pixelEvent} tracked`);
    } else {
      console.warn("fbq is not defined");
    }
  };

  return (
    <div
      className={`w-full md:w-300px rounded-lg overflow-hidden relative group hpver:text-white transition-all ease-in-out bg-white/50 bg-cover bg-center bg-repeat ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"} ${enableHoverTilt && !disabled ? "hover:rotate-3" : ""} ${className}`}
      style={{
        backgroundImage: `url(/${item.name
          ?.split(" ")[0]
          .toLowerCase()}.png), url(/placeholder.png)`,
        minHeight: "300px",
      }}
    >
      {disabled ? (
        <div className="flex absolute top-0 items-end w-full p-4 bg-black/40 text-white text-lg h-full">
          <p className="absolute text-center top-28 left-1/2 -translate-x-1/2 text-sm bg-black/60 px-3 py-1 rounded">
            {disabledLabel}
          </p>
          <div className="flex justify-between w-full">
            <span>{item.name}</span>
            <span>N {item.list_price}</span>
          </div>
        </div>
      ) : (
        <Link href={href ?? `/restaurant-menu/${item.id}`} onClick={handleMenuItemClick}>
        <div className="flex absolute top-0 items-end w-full p-4 hover:pb-8 transition-all bg-black/10 hover:bg-black/40 hover:text-white text-lg h-full">
          <p className="absolute text-center hover:underline top-32 -translate-x-80 group-hover:translate-x-0 transition-all">
            Click to Order
          </p>
          <div className="flex justify-between w-full">
            <span>{item.name}</span>
            <span>N {item.list_price}</span>
          </div>
        </div>
      </Link>
      )}
    </div>
  );
}
