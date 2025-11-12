import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants, type ButtonProps } from "@/components/ui/button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  maxVisible?: number;
}

const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  ({ currentPage, totalPages, onPageChange, showFirstLast = true, maxVisible = 5, ...props }, ref) => {
    const getVisiblePages = () => {
      const pages: (number | string)[] = [];
      const half = Math.floor(maxVisible / 2);

      if (totalPages <= maxVisible) {
        // Show all pages if total is less than max
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Calculate start and end
        let start = Math.max(1, currentPage - half);
        let end = Math.min(totalPages, currentPage + half);

        // Adjust if we're near the start or end
        if (currentPage <= half) {
          end = maxVisible;
        } else if (currentPage >= totalPages - half) {
          start = totalPages - maxVisible + 1;
        }

        // Add first page and ellipsis
        if (showFirstLast && start > 1) {
          pages.push(1);
          if (start > 2) {
            pages.push("ellipsis-start");
          }
        }

        // Add visible pages
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }

        // Add ellipsis and last page
        if (showFirstLast && end < totalPages) {
          if (end < totalPages - 1) {
            pages.push("ellipsis-end");
          }
          pages.push(totalPages);
        }
      }

      return pages;
    };

    const visiblePages = getVisiblePages();

    if (totalPages <= 1) {
      return null;
    }

    return (
      <nav
        ref={ref}
        className="flex items-center justify-center gap-1 sm:gap-2"
        aria-label="Pagination"
    {...props}
      >
        {showFirstLast && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="ios-transition-fast ios-hover"
            aria-label="First page"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Premier</span>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="ios-transition-fast ios-hover"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Précédent</span>
        </Button>

        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => {
            if (page === "ellipsis-start" || page === "ellipsis-end") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-1 text-muted-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              );
            }

            const pageNumber = page as number;
            const isActive = pageNumber === currentPage;

            return (
              <Button
                key={pageNumber}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNumber)}
                className={cn(
                  "ios-transition-fast ios-hover",
                  isActive && "bg-primary text-primary-foreground"
                )}
                aria-label={`Page ${pageNumber}`}
                aria-current={isActive ? "page" : undefined}
              >
                {pageNumber}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="ios-transition-fast ios-hover"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Suivant</span>
        </Button>

        {showFirstLast && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="ios-transition-fast ios-hover"
            aria-label="Last page"
          >
            <span className="hidden sm:inline">Dernier</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </nav>
    );
  }
);

Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
  ),
);
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">;

const PaginationLink = ({ className, isActive, size = "icon", ...props }: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className,
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to previous page" size="default" className={cn("gap-1 pl-2.5", className)} {...props}>
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to next page" size="default" className={cn("gap-1 pr-2.5", className)} {...props}>
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span aria-hidden className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
