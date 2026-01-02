import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/actions";
import { checkIssuerTransactionAccess } from "@/lib/issuer-utils";
import crypto from "crypto";

// POST - Create new broker split request
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getCurrentUserRole();

    if (userRole !== "broker" && userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const {
      issuerId,
      requestType,
      // Broker DTC information
      dtcParticipantNumber,
      dwacSubmitted,
      // Split quantities
      unitsQuantity,
      classAQuantity,
      warrantsQuantity,
      // All 3 CUSIPs
      unitsCusip,
      classACusip,
      warrantsCusip,
      // Notes
      notes
    } = body;

    // Validation
    if (!issuerId || !requestType) {
      return NextResponse.json({ error: "Missing required fields: issuerId, requestType" }, { status: 400 });
    }

    if (!dtcParticipantNumber || dtcParticipantNumber.length !== 4) {
      return NextResponse.json({ error: "DTC Participant Number must be exactly 4 digits" }, { status: 400 });
    }

    if (!unitsQuantity || !classAQuantity || !warrantsQuantity) {
      return NextResponse.json({ error: "All quantities are required (units, class A, warrants/rights)" }, { status: 400 });
    }

    if (!unitsCusip || !classACusip || !warrantsCusip) {
      return NextResponse.json({ error: "All CUSIPs are required (units, class A, warrants/rights)" }, { status: 400 });
    }

    // Check if issuer is suspended or pending (transactions blocked for both)
    const transactionAccess = await checkIssuerTransactionAccess(supabase, issuerId);
    if (!transactionAccess.allowed) {
      return NextResponse.json(
        { error: transactionAccess.reason || 'Cannot create transfer requests for this issuer' },
        { status: 403 }
      );
    }

    // Generate secure action token for email approve/reject buttons
    const actionToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Create the broker split request
    const { data: newRequest, error: insertError } = await supabase
      .from("transfer_agent_requests")
      .insert({
        issuer_id: issuerId,
        broker_id: user.id,
        request_type: requestType,
        // Broker DTC information
        dtc_participant_number: dtcParticipantNumber,
        dwac_submitted: dwacSubmitted || false,
        // Split quantities
        units_quantity: unitsQuantity,
        class_a_shares_quantity: classAQuantity,
        warrants_rights_quantity: warrantsQuantity,
        // All 3 CUSIPs
        units_cusip: unitsCusip,
        class_a_cusip: classACusip,
        warrants_cusip: warrantsCusip,
        // Use units_cusip as the primary cusip field for backwards compatibility
        cusip: unitsCusip,
        quantity: unitsQuantity,
        security_type: 'Units',
        // Action token for email buttons
        action_token: actionToken,
        action_token_expires_at: tokenExpiresAt.toISOString(),
        // Notes and metadata
        special_instructions: notes,
        priority: "Normal",
        status: "Pending",
        // These fields are not needed for broker requests
        shareholder_name: "N/A - Broker Request",
        account_number: dtcParticipantNumber
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    // Create initial communication
    await supabase
      .from("transfer_request_communications")
      .insert({
        request_id: newRequest.id,
        user_id: user.id,
        message: `Submitted broker split request for review. DTC Participant #: ${dtcParticipantNumber}. Units: ${unitsQuantity}, Class A: ${classAQuantity}, Warrants/Rights: ${warrantsQuantity}.`,
        is_internal: false
      });

    // Create action token record for tracking
    await supabase
      .from("broker_request_actions")
      .insert({
        request_id: newRequest.id,
        action_type: 'pending',
        action_token: actionToken,
        expires_at: tokenExpiresAt.toISOString()
      });

    // 🔔 SEND NOTIFICATIONS TO ADMINS WITH APPROVE/REJECT BUTTONS
    console.log('🔔 [BROKER-SPLIT] Starting notification process for request:', newRequest.id);
    console.log('🔔 [BROKER-SPLIT] User ID:', user.id);

    // Fetch broker and issuer details for notification
    const [brokerData, issuerData] = await Promise.all([
      supabase.from('users_new').select('id, name, email, company').eq('id', user.id).single(),
      supabase.from('issuers_new').select('id, issuer_name, split_security_type').eq('id', issuerId).single()
    ]);

    // Log errors if any
    if (brokerData.error) {
      console.log('🔔 [BROKER-SPLIT] Broker query error:', brokerData.error);
    }
    if (issuerData.error) {
      console.log('🔔 [BROKER-SPLIT] Issuer query error:', issuerData.error);
    }

    // Fallback: If broker not in users_new, use auth user data
    let finalBrokerData = brokerData.data;
    if (!finalBrokerData && user) {
      console.log('🔔 [BROKER-SPLIT] Using auth user data as fallback');
      finalBrokerData = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Broker',
        company: user.user_metadata?.company || ''
      };
    }

    console.log('🔔 [BROKER-SPLIT] Broker data:', finalBrokerData ? `✅ ${finalBrokerData.email}` : '❌ NULL');
    console.log('🔔 [BROKER-SPLIT] Issuer data:', issuerData.data ? `✅ ${issuerData.data.issuer_name}` : '❌ NULL');

    // Send notifications asynchronously (don't block response)
    if (finalBrokerData && issuerData.data) {
      console.log('🔔 [BROKER-SPLIT] ✅ Both broker and issuer data available, proceeding...');

      // Import notification service dynamically
      import('@/lib/services/broker-split-notification-service').then(({ notifyBrokerSplitRequestSubmitted }) => {
        console.log('🔔 [BROKER-SPLIT] ✅ Notification service imported successfully');

        notifyBrokerSplitRequestSubmitted(
          newRequest,
          finalBrokerData,
          issuerData.data,
          actionToken,
          request
        )
          .then(result => {
            console.log('🔔 [BROKER-SPLIT] ✅ SUCCESS! Result:', result);
          })
          .catch(err => {
            console.error('🔔 [BROKER-SPLIT] ❌ ERROR:', err);
          });
      }).catch(importErr => {
        console.error('🔔 [BROKER-SPLIT] ❌ Failed to import notification service:', importErr);
      });
    } else {
      console.error('🔔 [BROKER-SPLIT] ❌ SKIPPED - Missing data');
    }

    return NextResponse.json(newRequest, { status: 201 });
  } catch (err) {
    console.error("POST Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
