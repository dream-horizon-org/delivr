import { useNavigate } from "@remix-run/react";

export const OnboardingFlowHeader = ({onSetupExit}: {onSetupExit: () => void}) => {
    const navigate = useNavigate();

    return (<div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-2xl font-bold text-gray-900">Release Management Setup</h1>
            <p className="mt-1 text-sm text-gray-500">
                Configure your release management workflow
            </p>
            </div>
            
            {/* Exit Button */}
            <button
            type="button"
            onClick={() => onSetupExit()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
            Exit Setup
            </button>
        </div>
    </div>
  </div>)
}