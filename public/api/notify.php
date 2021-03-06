<?php
	require_once "require.php";
	
	if (property_exists($data, "event") && property_exists($data->event, "person") && property_exists($data->event->person, "id") && property_exists($data, "notification_id") && property_exists($data, "cta_id")) {
		$person_id = $data->event->person->id;
		$person = json_decode($firebase->get("$api_key/people/$person_id"), true);
		unset($person->events);
	
		$data = json_decode(json_encode($data), true);
		$notification = json_decode($firebase->get("$api_key/ctas/$data[cta_id]/notifications/$data[notification_id]"), true);
	
		if (!isset($person["info"]["name"])) {
			$person["info"]["name"] = $person["info"]["firstName"] . " " . $person["info"]["lastName"];
		}
	
		if (isset($person) && isset($person["info"])) {
			$data["event"]["person"] = array_merge($person["info"], $data["event"]["person"]);
		}

		$data["event"]["data"] = prepDataTable($data["event"]);
	
		foreach ($notification as $part => $v) {
			$notification[$part] = LightnCandy::compile($notification[$part]);
			$notification[$part] = LightnCandy::prepare($notification[$part]);
			$notification[$part] = $notification[$part]($data["event"]);
		}
		
		if ($notification["replyTo"] != "") {
			$replyto = explode("<", $notification["replyTo"]);
		
			if (count($replyto) == 1) {
				$replyto = trim(str_replace(">", "", $replyto[1]));
				$mail->addReplyTo( $replyto );
			} else {
				$replyto = trim($notification["replyTo"]);
				$mail->addReplyTo( $replyto, trim($replyto[0]) );
			}
		}
	
		$mail->setFrom('no-reply@remetric.com', 'Remetric');
		$mail->Subject = $notification["subject"];
		$mail->Body = $notification["message"];
		$mail->Sender = str_replace("@", "=", $notification["replyTo"]);
	
		foreach (explode(",", $notification["to"]) as $to) {
			$parts = explode("<", $to);
		
			if (count($parts) == 1) {
				if (strpos($to, "@") !== false) {
					$mail->addAddress( trim($to) );
				}
			} else {
				$address = trim(str_replace(">", "", $parts[1]));
			
				if (strpos($address, "@") !== false) {
					$mail->addAddress( $address, trim($parts[0]) );
				}
			}
		
			if ($debug) {
				if(!$mail->send()) {
					print_r(array("error" => $mail->ErrorInfo));
				} else {
			    print_r(array(
						"success" => 'Notification is sent.',
						'notification' => $mail
					));
				}
			} else {
				$mail->send();
			}
		
			$mail->ClearAddresses();
		}
	} else {
		if ($debug) {
			print_r(array(
				'error' => 'Please supply a notification and person id.'
			));
		}
	}
	
?>