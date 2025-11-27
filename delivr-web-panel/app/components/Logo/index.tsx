import { useNavigate } from "@remix-run/react";
import { route } from "routes-gen";
import { useMantineTheme } from "@mantine/core";

export function Logo(props: React.ComponentPropsWithoutRef<"svg">) {
  const navigate = useNavigate();
  const theme = useMantineTheme();
  
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 60"
      onClick={() => navigate(route("/dashboard"))}
    >
      <g fill="none" fillRule="evenodd">
        <text
          x="10"
          y="40"
          fontFamily="Arial, sans-serif"
          fontSize="50"
          fontWeight="bold"
          fill={theme.other.brand.primary}
        >
          DOTA
        </text>
      </g>
    </svg>
  );
}
