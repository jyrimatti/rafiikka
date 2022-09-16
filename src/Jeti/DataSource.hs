{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE GADTs #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE FlexibleInstances #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE FlexibleContexts #-}
{-# LANGUAGE OverloadedLabels #-}
{-# LANGUAGE NamedFieldPuns #-}
{-# OPTIONS_GHC -Wno-name-shadowing #-}

module Jeti.DataSource where
    
import Universum hiding (get)
import Amcharts.DataSource (luoDatasource, DataType (InfraData, Other), DataSource, mkDataSource)
import Infra.Types ( InfraType(Rata, Liikennepaikkavali, Rautatieliikennepaikka, LiikennepaikanOsa, Raideosuus, Laituri, Elementti, LiikenteenohjauksenRaja, Kunnossapitoalue, Liikenteenohjausalue, Kayttokeskus, Liikennesuunnittelualue), RautatieliikennepaikkaTyyppi, UICCode, RaideosuusTyyppi, LaituriTyyppi, AikataulupaikkaTyyppi (APLiikennepaikanOsa, APRautatieliikennepaikka) )
import URI (ratanumerotUrl, liikennepaikkavalitUrl, rautatieliikennepaikatUrl, liikennepaikanOsatUrl, raideosuudetUrl, laituritUrl, elementitUrl, lorajatUrl, ratapihapalveluTyypitUrl, opastinTyypitUrl, vaihdeTyypitUrl, kunnossapitoalueetMetaUrl, liikenteenohjausalueetMetaUrl, kayttokeskuksetMetaUrl, liikennesuunnittelualueetMetaUrl, infraObjektityypitUrl, esTyypitUrl, asiatUrl)
import JSDOM.Types (JSM, FromJSVal (fromJSVal), ToJSVal)
import Types (Ratakmvali(Ratakmvali), Kmetaisyys (Kmetaisyys), Distance (Distance), OID, Ratakmetaisyys (ratanumero), Point, fromListWithTunniste, MultiLineString, kmetaisyys, ratanumero, FintrafficSystem (Infra))
import qualified Data.Map as Map
import Time (Interval)
import Language.Javascript.JSaddle (toJSVal_aeson, JSVal, (!))
import Language.Javascript.JSaddle.Classes (ToJSVal(toJSVal))
import Data.Aeson (ToJSON)
import GHCJS.Marshal.Internal (fromJSVal_generic)
import Monadic (doFromJSVal, readProperty, propFromJSVal)
import Control.Lens ((?~))
import GHC.Records (getField)
import Amcharts.Events (Done (Done, target), on1, dispatch)
import Control.Lens.Action ((^!))
import GetSet (get, setVal)
import Data.Maybe (fromJust)
import Data.List.NonEmpty (singleton)
import Data.Map (mapKeys, mapWithKey)
import Control.Applicative.HT (liftA5, lift5, lift3, lift4)
import Jeti.Types

estyypitDS :: JSM Amcharts.DataSource.DataSource
estyypitDS = luoDatasource (Other "Ennakkosuunnitelmatyypit") (esTyypitUrl @ESTyyppi) id

data AsiaDto = AsiaDto {
  asia :: Text,
  symbolit :: [Text]
} deriving (Show,Generic)
instance ToJSON AsiaDto
instance ToJSVal AsiaDto where
  toJSVal = toJSVal_aeson
instance FromJSVal AsiaDto where
  fromJSVal = doFromJSVal "AsiaDto" $
    liftA2 AsiaDto <$> propFromJSVal "asia"
                   <*> propFromJSVal "symbolit"

asiatDS :: JSM Amcharts.DataSource.DataSource
asiatDS = luoDatasource (Other "Asiat") (asiatUrl @AsiaDto) $ fmap asia
