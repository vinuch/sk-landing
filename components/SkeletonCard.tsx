export default function SkeletonCard() {
    return (
        <div className="w-full md:w-[300px] rounded-lg overflow-hidden relative bg-gray-200 animate-pulse min-h-[300px]">
            {/* overlay text area */}
            <div className="absolute top-0 left-0 w-full h-full bg-black/10 flex flex-col justify-end p-4 gap-2">
                <div className="h-6 bg-gray-300 rounded w-3/4"></div> {/* name */}
                <div className="h-5 bg-gray-300 rounded w-1/2"></div> {/* price */}
            </div>
        </div>
    );
}
