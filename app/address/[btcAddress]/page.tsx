"use client";

import { LandingPage } from "@/components/landing-page";
import { useParams } from "next/navigation";

export default function AddressPage() {
  const params = useParams();
  const btcAddress = params?.btcAddress as string;
  const handleSearch = () => {};
  return <LandingPage onSearch={handleSearch} initialSearchQuery={btcAddress} />;
}