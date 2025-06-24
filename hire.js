// On your "Hire" Page Code

import { session } from 'wix-storage';
import { fetch } from 'wix-fetch'; // For calling backend HTTP functions

// --- Configuration ---
const CEO_EMAIL = "ceo@example.com"; // Replace with actual CEO email
const DEV_EMAIL = "dev@example.com"; // Replace with actual Dev email
const CEO_CONTACT_DISPLAY_NAME = "Corey LTS (CEO)";
const ACTUAL_DEV_CONTACT_NAME = "the Developer";

const TRAINING_MANUAL_URL = 'https://example.com/manual';
const TRAINING_VIDEO_URL = 'https://example.com/video';
const TRAINING_RECORDINGS_URL = 'https://example.com/recordings';
const LTS_DISCORD_SERVER_INVITE_URL = 'https://discord.gg/yourinvite'; // Replace

let onboardingState = {};

const ONBOARDING_STEPS = [
    'start', 'collect_first_name', 'collect_last_name', 'check_computer_response',
    'ask_bilingual', 'check_bilingual_response', 'ask_languages', 'ask_state',
    'ask_email',
    'final_instructions_pre_contract',
    'awaiting_sign_contract_command',
    'awaiting_adobe_signature_completion',
    'ask_add_friends',
    'check_add_friends_response',
    'provide_training_materials',
    'confirm_training_completion',
    'final_welcome_and_discord_link',
    'completed'
];

// --- Helper to call backend HTTP functions ---
async function callBackend(endpoint, payload) {
    const baseUrl = "/_functions"; // Or your site URL if testing locally with wixDev
    try {
        const httpResponse = await fetch(`${baseUrl}/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (httpResponse.ok) {
            return await httpResponse.json();
        } else {
            const errorBody = await httpResponse.json().catch(() => ({ error: "Failed to parse error from backend" }));
            console.error(`Backend call to ${endpoint} failed: ${httpResponse.status}`, errorBody);
            throw new Error(errorBody.error || `Backend error: ${httpResponse.status}`);
        }
    } catch (err) {
        console.error(`Error calling backend function ${endpoint}:`, err);
        throw err; // Re-throw to be caught by the caller
    }
}

async function sendNotificationToStaff(subject, htmlMessage, recipient) {
    try {
        await callBackend("sendOnboardingNotification", {
            recipientEmail: recipient,
            subject: subject,
            htmlMessage: htmlMessage
        });
        console.log(`Notification attempt to ${recipient} successful for: ${subject}`);
        return true;
    } catch (error) {
        console.error(`Failed to send notification to ${recipient} for ${subject}:`, error);
        $w("#statusText").text = `Error sending notification: ${error.message}. Please inform admin.`;
        $w("#statusText").show();
        return false;
    }
}


$w.onReady(function () {
    // Load state from session storage if exists
    const savedState = session.getItem("onboardingState");
    if (savedState) {
        onboardingState = JSON.parse(savedState);
        if (onboardingState.step && onboardingState.step !== 'completed') {
            displayCurrentStep();
        } else {
            startOnboarding(); // Or show a default "type start" message
        }
    } else {
        startOnboarding();
    }

    $w("#sendButton").onClick(async () => {
        const userInput = $w("#userInput").value.trim();
        $w("#userInput").value = ""; // Clear input
        $w("#statusText").text = "";
        $w("#statusText").hide();
        await processUserInput(userInput);
    });

    // Optional: Allow Enter key to submit
    $w("#userInput").onKeyPress(async (event) => {
        if (event.key === "Enter") {
            const userInput = $w("#userInput").value.trim();
            $w("#userInput").value = ""; // Clear input
            $w("#statusText").text = "";
            $w("#statusText").hide();
            await processUserInput(userInput);
        }
    });
});

function saveState() {
    session.setItem("onboardingState", JSON.stringify(onboardingState));
}

function startOnboarding() {
    onboardingState = {
        step: 'start',
        data: {}
    };
    saveState();
    displayCurrentStep();
}

function displayCurrentStep(messageOverride = null) {
    const currentStepName = onboardingState.step;
    let messageContent = "";
    let nextStepInFlow = ""; // For auto-advancing steps

    console.log(`Displaying step: ${currentStepName}`);

    if (messageOverride) {
        $w("#botMessage").text = messageOverride;
        return;
    }

    switch (currentStepName) {
        case 'start':
            messageContent = "Welcome to the New Hire Onboarding Process!\n" +
                "I'll guide you through the initial steps.\n\n" +
                "Please type your responses in the box below and click 'Send'.\n\n" +
                "Let's start with your name. What is your legal first name?";
            nextStepInFlow = 'collect_first_name';
            break;
        case 'collect_first_name':
            messageContent = "Thank you. And what is your legal last name?";
            nextStepInFlow = 'collect_last_name';
            break;
        case 'collect_last_name':
            messageContent = "1. Do you have a computer or laptop (not an iPad or tablet) and headset that you will be using for work? (Y/N)";
            nextStepInFlow = 'check_computer_response';
            break;
        case 'check_computer_response': // This case is entered after processing input for it
            messageContent = "2. Are you bilingual? (Y/N)";
            nextStepInFlow = 'check_bilingual_response';
            break;
        case 'check_bilingual_response':
            if (onboardingState.data.bilingual) {
                messageContent = "Great! What languages do you speak fluently (besides English, if applicable)?";
                nextStepInFlow = 'ask_languages';
            } else {
                messageContent = "3. In which state are you located?";
                nextStepInFlow = 'ask_state';
            }
            break;
        case 'ask_languages':
            messageContent = "3. In which state are you located?";
            nextStepInFlow = 'ask_state';
            break;
        case 'ask_state':
            messageContent = "4. What is your primary email address? (This is where your contract will be sent)";
            nextStepInFlow = 'ask_email';
            break;
        case 'ask_email': // After email is collected
            messageContent = "DECLARATION. I hereby declare that the information I am providing is true...\n\n" +
                "To proceed with your Independent Contractor Agreement using Adobe Sign, please type `sign contract`.";
            nextStepInFlow = 'awaiting_sign_contract_command';
            break;
        case 'awaiting_sign_contract_command':
             messageContent = "Please type `sign contract` to proceed or `reset` to start over.";
            // Stays in this step until "sign contract"
            break;
        case 'awaiting_adobe_signature_completion':
            // Message set by the contract signing logic
            break;
        case 'ask_add_friends':
            const friendsToAddList = ["- Adam Black (Support)"];
            if (CEO_EMAIL) { // Check if CEO email is configured
                friendsToAddList.push(`- ${CEO_CONTACT_DISPLAY_NAME} (You will be formally introduced)`);
            }
            const friendsToAddStr = friendsToAddList.join("\n");
            messageContent = "Great! Your contract process has been initiated.\n\n" +
                "Now, for the next steps:\n" +
                "1. Key contacts for you will be:\n" +
                `${friendsToAddStr}\n\n` +
                "Please acknowledge you've noted this. (Type Y or OK)";
            nextStepInFlow = 'check_add_friends_response';
            break;
        case 'check_add_friends_response': // after Y/OK
             messageContent = "2. Next, please complete the following training materials:\n" +
                `   - Read the Training Manual: ${TRAINING_MANUAL_URL}\n` +
                `   - Watch the Training Video: ${TRAINING_VIDEO_URL}\n` +
                `   - Listen to Training Recordings: ${TRAINING_RECORDINGS_URL}\n\n` +
                "Once you have completed ALL of these, please reply with 'DONE'.";
            nextStepInFlow = 'confirm_training_completion';
            break;
        case 'confirm_training_completion': // After 'DONE' is received and processed
            // Notifications are sent, then this message.
             messageContent = "Welcome aboard officially!\n\n" +
                "Your final steps are:\n" +
                `- Please await contact from ${CEO_CONTACT_DISPLAY_NAME} for your next assignments.\n` +
                "- Adam Black is your human contact for project specific questions and quality control.\n" +
                "- Samantha is your Discord training and agent support bot on the main server (if applicable).\n" +
                `Here is the link to the LTS Discord Server: ${LTS_DISCORD_SERVER_INVITE_URL}\n\n` +
                "This fully concludes your automated onboarding. Welcome officially to the team!";
            nextStepInFlow = 'completed';
            break;
        case 'completed':
            messageContent = "Your onboarding is complete! You can close this page or type `reset` to start over.";
            $w("#userInput").disable();
            $w("#sendButton").disable();
            break;
        default:
            messageContent = "Something went wrong. Current step: " + currentStepName + ". Type `reset` to start over.";
    }

    $w("#botMessage").text = messageContent;
    if (nextStepInFlow && currentStepName !== onboardingState.step) { // If logic above didn't change it
      // This means the step is just displaying info, expecting input next
    } else if (nextStepInFlow) { // Auto-advanced
        onboardingState.step = nextStepInFlow;
    }
    saveState();
}

async function processUserInput(input) {
    const processedInput = input.toLowerCase().trim();
    const currentStepName = onboardingState.step;

    if (processedInput === 'reset') {
        startOnboarding();
        $w("#userInput").enable();
        $w("#sendButton").enable();
        return;
    }

    let userMessageForNextStep = null; // Used if we need to show a temp message before the standard one

    switch (currentStepName) {
        case 'start': // Should be auto-advanced by displayCurrentStep
        case 'collect_first_name':
            if (input) {
                onboardingState.data.first_name = input;
                onboardingState.step = 'collect_last_name';
            } else {
                userMessageForNextStep = "Please provide your legal first name.";
            }
            break;
        case 'collect_last_name':
            if (input) {
                onboardingState.data.last_name = input;
                onboardingState.step = 'check_computer_response'; // To ask the question
            } else {
                userMessageForNextStep = "Please provide your legal last name.";
            }
            break;
        case 'check_computer_response':
            if (processedInput === 'y') {
                onboardingState.data.has_computer = true;
                onboardingState.step = 'check_bilingual_response'; // To ask the next question
            } else if (processedInput === 'n') {
                onboardingState.data.has_computer = false;
                userMessageForNextStep = "A computer or laptop is required. Onboarding cannot continue.";
                onboardingState.step = 'completed'; // End process
                session.removeItem("onboardingState");
                $w("#userInput").disable();
                $w("#sendButton").disable();
            } else {
                userMessageForNextStep = "Invalid input. Please answer Y or N.";
            }
            break;
        case 'check_bilingual_response':
            if (processedInput === 'y') {
                onboardingState.data.bilingual = true;
                onboardingState.step = 'ask_languages';
            } else if (processedInput === 'n') {
                onboardingState.data.bilingual = false;
                onboardingState.step = 'ask_state';
            } else {
                userMessageForNextStep = "Invalid input. Please answer Y or N.";
            }
            break;
        case 'ask_languages':
            onboardingState.data.languages = input;
            onboardingState.step = 'ask_state';
            break;
        case 'ask_state':
            onboardingState.data.state = input;
            const restrictedStates = ['oregon', 'or', 'washington', 'wa', 'california', 'ca'];
            if (restrictedStates.includes(processedInput)) {
                userMessageForNextStep = "Unfortunately, we cannot proceed with applications from Oregon, Washington, or California at this time.";
                onboardingState.step = 'completed';
                session.removeItem("onboardingState");
                $w("#userInput").disable();
                $w("#sendButton").disable();
            } else {
                onboardingState.step = 'ask_email';
            }
            break;
        case 'ask_email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(input)) {
                onboardingState.data.email = input;
                onboardingState.step = 'final_instructions_pre_contract';
            } else {
                userMessageForNextStep = "That doesn't look like a valid email. Please try again.";
            }
            break;
        case 'awaiting_sign_contract_command':
            if (processedInput === 'sign contract') {
                $w("#statusText").text = "Preparing your contract with Adobe Sign. This may take a moment...";
                $w("#statusText").show();
                $w("#sendButton").disable();
                $w("#userInput").disable();

                try {
                    const agreementName = `Independent Contractor Agreement - ${onboardingState.data.first_name} ${onboardingState.data.last_name} - ${new Date().toISOString().split('T')[0]}`;
                    const adobeResponse = await callBackend("initiateAdobeSignContract", {
                        email: onboardingState.data.email,
                        firstName: onboardingState.data.first_name,
                        lastName: onboardingState.data.last_name,
                        agreementName: agreementName
                    });

                    onboardingState.data.adobe_agreement_id = adobeResponse.agreementId;
                    userMessageForNextStep = "Your Independent Contractor Agreement is ready.\n\n" +
                        `Please click this link to review and sign: ${adobeResponse.signingUrl}\n\n` +
                        "(The link will open in a new tab. If your browser blocks pop-ups, you may need to allow it or copy the link.)\n\n" +
                        "Once you have COMPLETED the signing process via Adobe, please return here and type `contract signed`.";
                    onboardingState.step = 'awaiting_adobe_signature_completion';
                    $w("#statusText").hide();
                } catch (error) {
                    console.error("Adobe Sign error:", error);
                    userMessageForNextStep = `Error preparing contract: ${error.message}. Please contact an administrator or type 'reset' to try again.`;
                    $w("#statusText").text = `Error: ${error.message}`; // Keep status text visible
                    // Don't advance step, let them retry or reset
                } finally {
                    $w("#sendButton").enable();
                    $w("#userInput").enable();
                }

            } else {
                userMessageForNextStep = "Please type `sign contract` to proceed or `reset` to start over.";
            }
            break;
        case 'awaiting_adobe_signature_completion':
            if (processedInput === 'contract signed') {
                onboardingState.data.contract_process_completed_by_user = true;
                userMessageForNextStep = "Thank you for confirming! Your agreement is marked as signed on your end.";
                onboardingState.step = 'ask_add_friends';

                // Notify Staff (CEO & Dev)
                const staffNotificationSubject = `Contract Signed: ${onboardingState.data.first_name} ${onboardingState.data.last_name}`;
                const staffNotificationBody = `
                    <p>ALERT: User <b>${onboardingState.data.first_name} ${onboardingState.data.last_name}</b>
                    (Email: ${onboardingState.data.email}) has indicated they have SIGNED the Independent Contractor Agreement.</p>
                    <p>Adobe Agreement ID: ${onboardingState.data.adobe_agreement_id || 'N/A'}</p>
                    <p>Please verify the document status in Adobe Sign.</p>`;
                if (CEO_EMAIL) await sendNotificationToStaff(staffNotificationSubject, staffNotificationBody, CEO_EMAIL);
                if (DEV_EMAIL) await sendNotificationToStaff(staffNotificationSubject, staffNotificationBody, DEV_EMAIL);

            } else {
                userMessageForNextStep = "Please use the Adobe Sign link. Once signed, type `contract signed` back here.";
            }
            break;
        case 'check_add_friends_response':
            if (processedInput === 'y' || processedInput === 'ok') {
                onboardingState.data.added_friends_acknowledged = true; // Renamed from 'added_friends'
                onboardingState.step = 'provide_training_materials';
            } else {
                userMessageForNextStep = "Invalid input. Please type Y or OK to acknowledge.";
            }
            break;
        case 'confirm_training_completion':
            if (processedInput === 'done') {
                onboardingState.data.training_completed = true;
                
                // Notify Staff (CEO & Dev) about training completion
                let summary = `New Hire Onboarding Information for: ${onboardingState.data.first_name || 'N/A'} ${onboardingState.data.last_name || 'N/A'}<br>` +
                    `--------------------------------------------------<br>` +
                    `Has Computer/Laptop: ${onboardingState.data.has_computer ? 'Yes' : 'No'}<br>` +
                    `Bilingual: ${onboardingState.data.bilingual ? 'Yes' : 'No'}<br>`;
                if (onboardingState.data.languages) {
                    summary += `Languages: ${onboardingState.data.languages}<br>`;
                }
                summary += `State: ${onboardingState.data.state || 'N/A'}<br>` +
                    `Email: ${onboardingState.data.email || 'N/A'}<br>` +
                    `Contract Process Initiated: Yes (Adobe Agreement ID: ${onboardingState.data.adobe_agreement_id || 'N/A'})<br>` +
                    `Acknowledged Contacts: ${onboardingState.data.added_friends_acknowledged ? 'Yes' : 'No'}<br>` +
                    `Training Completed: Yes<br>` +
                    `--------------------------------------------------<br>` +
                    `This user has completed the training materials. The bot will provide final instructions.`;

                const trainingNotifSubject = `Training Completed: ${onboardingState.data.first_name} ${onboardingState.data.last_name}`;
                if (CEO_EMAIL) await sendNotificationToStaff(trainingNotifSubject, `<p>${summary.replace(/\n/g, '<br>')}</p>`, CEO_EMAIL);
                if (DEV_EMAIL) await sendNotificationToStaff(trainingNotifSubject, `<p>${summary.replace(/\n/g, '<br>')}</p>`, DEV_EMAIL);
                
                onboardingState.step = 'final_welcome_and_discord_link'; // auto-advances
            } else {
                userMessageForNextStep = "Please type 'DONE' once you have completed all training materials.";
            }
            break;
        case 'completed':
            userMessageForNextStep = "Your onboarding is already complete. Type `reset` to start over.";
            break;
        default:
             userMessageForNextStep = "I'm a bit confused. Type `reset` to start over. (Current step: " + currentStepName + ")";
    }

    saveState();
    if (userMessageForNextStep) {
        displayCurrentStep(userMessageForNextStep); // Show temporary message
        if (onboardingState.step !== currentStepName && onboardingState.step !== 'completed') {
             // If step was advanced by logic above, and it's not a temp message for same step,
             // then call displayCurrentStep again after a short delay to show the *new* step's standard message.
             // This is a bit complex, might need refinement based on flow.
             // For now, if userMessageForNextStep is set, it means we show that, and the next user input
             // will trigger displayCurrentStep() for the *then current* step.
        }
    } else {
        displayCurrentStep(); // Display the standard message for the (potentially new) current step
    }
}