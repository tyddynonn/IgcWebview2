<?php
$url='http://api.geonames.org/astergdemJSON?username=tyddynonn&lat='.$_GET['lat'].'&lng='.$_GET['lng'];
 $ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$json = curl_exec($ch);
	
    curl_close($ch);
   echo $json;

?>
