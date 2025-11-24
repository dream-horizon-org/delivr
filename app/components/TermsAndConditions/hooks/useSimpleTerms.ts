import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { TERMS_QUERY_KEYS } from '~/constants/terms';
import { acceptTerms } from '../data/acceptTerms';
import { getOwnerTermsStatus } from '../data/getOwnerTermsStatus';

export const useSimpleTerms = () => {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  // Get terms status
  const { data: termsStatus, isLoading } = useQuery(
    TERMS_QUERY_KEYS.OWNER_STATUS,
    getOwnerTermsStatus
  );

  // Accept terms mutation
  const { mutate: acceptTermsMutation, isLoading: isAccepting } = useMutation(
    acceptTerms,
    {
      onSuccess: () => {
        // Invalidate cache to refetch status
        queryClient.invalidateQueries(TERMS_QUERY_KEYS.OWNER_STATUS);
      },
    }
  );

  // Show/hide modal based on terms status
  useEffect(() => {
    if (!termsStatus || isLoading) return;

    // Show modal if terms not accepted
    if (termsStatus.isOwner && !termsStatus.termsAccepted) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [termsStatus, isLoading]);

  const handleAcceptTerms = async () => {
    if (!termsStatus?.currentRequiredVersion) return;
    
    acceptTermsMutation({ 
      termsVersion: termsStatus.currentRequiredVersion 
    });
  };

  return {
    showModal,
    termsStatus,
    isLoading,
    isAccepting,
    acceptTerms: handleAcceptTerms,
    closeModal: () => setShowModal(false), // For manual close if needed
  };
};
