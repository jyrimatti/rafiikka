{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE GADTs #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE FlexibleInstances #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE FlexibleContexts #-}
{-# LANGUAGE OverloadedStrings #-}
{-# OPTIONS_GHC -Wno-name-shadowing #-}

module Jeti.DataSource where

import Universum hiding (get)
import Amcharts.DataSource (luoDatasource, DataType (Other), DataSource)
import URI (esTyypitUrl, asiatUrl)
import JSDOM.Types (JSM, FromJSVal (fromJSVal), ToJSVal)
import Language.Javascript.JSaddle (toJSVal_aeson)
import Language.Javascript.JSaddle.Classes (ToJSVal(toJSVal))
import Data.Aeson (ToJSON)
import Monadic (doFromJSVal, propFromJSVal)
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
